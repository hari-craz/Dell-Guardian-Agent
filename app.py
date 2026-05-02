from __future__ import annotations

from collections import deque
from contextlib import suppress
from datetime import datetime, timezone
import os
import subprocess
import threading
import time

from flask import Flask, jsonify, request
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


def is_password_valid(password: str) -> bool:
    return password == ADMIN_PASSWORD


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


def execute_host_action(action: str) -> bool:
    action_map = {
        "shutdown": [
            "nsenter",
            "--target",
            "1",
            "--mount",
            "--uts",
            "--ipc",
            "--net",
            "--pid",
            "shutdown",
            "now",
        ],
        "reboot": [
            "nsenter",
            "--target",
            "1",
            "--mount",
            "--uts",
            "--ipc",
            "--net",
            "--pid",
            "reboot",
        ],
    }

    command = action_map.get(action)
    if not command:
        return False

    with suppress(Exception):
        result = subprocess.run(command, check=False, timeout=8)
        return result.returncode == 0

    return False


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


@app.route("/ping")
def ping():
    log_event("Ping request received", source="api")
    return jsonify(status="DELL_M380_OK")


@app.route("/control", methods=["POST"])
def control():
    payload = request.get_json(silent=True) or {}
    action = str(payload.get("action", "")).strip().lower()
    password = str(payload.get("password", ""))

    if action not in {"shutdown", "reboot"}:
        return jsonify(status="INVALID_ACTION"), 400

    if not is_password_valid(password):
        log_event(f"Unauthorized {action} attempt", level="warning", source="api")
        return jsonify(status="ACCESS_DENIED"), 403

    if not execute_host_action(action):
        log_event(f"Failed {action} execution", level="critical", source="api")
        return jsonify(status="ACTION_FAILED"), 500

    log_event(f"Authorized {action} triggered", level="critical", source="api")
    if action == "shutdown":
        return jsonify(status="SHUTDOWN_TRIGGERED")
    return jsonify(status="REBOOT_TRIGGERED")


@app.route("/stats")
def stats():
    return jsonify(collect_stats())


@app.route("/logs")
def logs():
    return jsonify(logs=get_event_log())


if __name__ == "__main__":
    log_event("Secure Dell Guardian Agent started")
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "10001")))