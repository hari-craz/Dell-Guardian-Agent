from __future__ import annotations

from collections import deque
from contextlib import suppress
from datetime import datetime, timezone
import os
import subprocess
import threading
import time

from flask import Flask, jsonify, render_template, request
import psutil


app = Flask(__name__)

ADMIN_PASSWORD = os.getenv("DELL_GUARDIAN_PASSWORD", "hari1234")
DISPLAY_NAME = os.getenv("DELL_GUARDIAN_HOSTNAME", "Dell M380")
DISPLAY_IP = os.getenv("DELL_GUARDIAN_IP", "192.168.13.5")
CONTAINER_STATUS = os.getenv("DELL_GUARDIAN_CONTAINER_STATUS", "Running")
LOG_LIMIT = int(os.getenv("DELL_GUARDIAN_LOG_LIMIT", "200"))

_events = deque(maxlen=LOG_LIMIT)
_event_lock = threading.Lock()

psutil.cpu_percent(interval=None)


def log_event(message: str, level: str = "info", source: str = "system") -> dict:
    entry = {
        "timestamp": datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S"),
        "level": level,
        "source": source,
        "message": message,
    }
    with _event_lock:
        _events.appendleft(entry)
    print(f"[{entry['timestamp']}] {level.upper()} {source}: {message}", flush=True)
    return entry


def get_event_log() -> list[dict]:
    with _event_lock:
        return list(_events)


def is_authorized() -> bool:
    return request.args.get("key", "") == ADMIN_PASSWORD


def human_bytes(value: float) -> str:
    units = ["B", "KB", "MB", "GB", "TB", "PB"]
    amount = value
    for unit in units:
        if amount < 1024.0 or unit == units[-1]:
            return f"{amount:.1f} {unit}"
        amount /= 1024.0
    return f"{amount:.1f} PB"


def human_uptime(seconds: float) -> str:
    total_seconds = max(0, int(seconds))
    days, remainder = divmod(total_seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, seconds_left = divmod(remainder, 60)
    if days:
        return f"{days}d {hours:02d}h {minutes:02d}m {seconds_left:02d}s"
    if hours:
        return f"{hours}h {minutes:02d}m {seconds_left:02d}s"
    return f"{minutes}m {seconds_left:02d}s"


def get_docker_running_count() -> int | None:
    with suppress(Exception):
        import docker  # type: ignore

        client = docker.from_env()
        return len(client.containers.list(filters={"status": "running"}))

    with suppress(Exception):
        result = subprocess.run(
            ["docker", "ps", "-q"],
            capture_output=True,
            text=True,
            check=False,
            timeout=3,
        )
        if result.returncode == 0:
            lines = [line for line in result.stdout.splitlines() if line.strip()]
            return len(lines)

    return None


def collect_stats() -> dict:
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    uptime_seconds = time.time() - psutil.boot_time()
    cpu_load = psutil.cpu_percent(interval=None)
    docker_count = get_docker_running_count()

    return {
        "hostname": DISPLAY_NAME,
        "ip": DISPLAY_IP,
        "container_status": CONTAINER_STATUS,
        "server_time": datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S"),
        "cpu_load_percent": round(cpu_load, 1),
        "ram_usage_percent": round(memory.percent, 1),
        "ram_used": human_bytes(memory.used),
        "ram_total": human_bytes(memory.total),
        "disk_usage_percent": round(disk.percent, 1),
        "disk_used": human_bytes(disk.used),
        "disk_total": human_bytes(disk.total),
        "uptime": human_uptime(uptime_seconds),
        "uptime_seconds": int(uptime_seconds),
        "docker_running_count": docker_count,
    }


@app.route("/")
def index():
    log_event("Dashboard page opened", source="ui")
    return render_template(
        "index.html",
        dashboard_title="Dell Guardian Agent Control Center",
        display_name=DISPLAY_NAME,
        display_ip=DISPLAY_IP,
    )


@app.route("/ping")
def ping():
    log_event("Ping request received", source="api")
    return jsonify(status="DELL_M380_OK")


@app.route("/shutdown")
def shutdown():
    if not is_authorized():
        log_event("Unauthorized shutdown attempt", level="warning", source="api")
        return jsonify(status="ACCESS_DENIED"), 403

    log_event("Authorized shutdown triggered", level="critical", source="api")
    os.system("shutdown now")
    return jsonify(status="SHUTDOWN_TRIGGERED")


@app.route("/reboot")
def reboot():
    if not is_authorized():
        log_event("Unauthorized reboot attempt", level="warning", source="api")
        return jsonify(status="ACCESS_DENIED"), 403

    log_event("Authorized reboot triggered", level="critical", source="api")
    os.system("reboot")
    return jsonify(status="REBOOT_TRIGGERED")


@app.route("/stats")
def stats():
    return jsonify(collect_stats())


@app.route("/logs")
def logs():
    return jsonify(logs=get_event_log())


if __name__ == "__main__":
    log_event("Secure Dell Guardian Agent started")
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5051")))