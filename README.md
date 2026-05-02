# 🛡️ Dell Guardian Agent — Production Server Control Center

<div align="center">

![Docker](https://img.shields.io/badge/Docker-Portainer%20Ready-blue?logo=docker)
![Backend](https://img.shields.io/badge/Backend-Flask%20%2B%20Gunicorn-green?logo=flask)
![Frontend](https://img.shields.io/badge/Frontend-React%2018-61dafb?logo=react)
![Security](https://img.shields.io/badge/Security-POST%20Validated-orange)
![Deployment](https://img.shields.io/badge/Deployment-Linux%20Host%20Control-red)
![Status](https://img.shields.io/badge/Status-Production%20Hardened-success)

### Secure Dockerized Dashboard for Remote Dell M380 Server Control
**A hardened backend control center running on Debian with live telemetry, audit logging, and guarded power actions.**

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Security](#security)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Usage](#usage)
- [File Structure](#file-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## 🎯 Overview

Dell Guardian Agent is a production-ready Flask application designed to run in Docker on Debian servers. It provides:

- **Secure Remote Control**: POST-validated shutdown and reboot commands using `nsenter` for host namespace access
- **Live System Metrics**: Real-time CPU, RAM, disk, uptime, and Docker container statistics
- **Dark-Themed Dashboard**: Professional NOC-style React frontend with Bootstrap 5 and Font Awesome
- **Audit Logging**: Complete event log with timestamps, severity levels, and source tracking
- **Password-Protected Actions**: Modal confirmation with server-side validation
- **Portainer Compatible**: Designed for seamless deployment in Docker management platforms

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTERNET (HTTPS/443)                         │
│                   Telegram Cloud Alerts                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   LAN: 192.168.13.0/24                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────┐                                │
│  │  ROUTER/SWITCH              │                                │
│  │  192.168.13.1               │                                │ 
│  └──────────────┬──────────────┘                                │
│                 │                                               │
│    ┌────────────┼────────────────────────────────┐              │
│    ▼            ▼                                ▼              │
│                                                                 │
│ ┌─────────────────────┐  ┌──────────────────────────────────┐   │
│ │ DELL M380 Server    │  │ DOCKER HOST (Debian Linux)       │   │
│ │ 192.168.13.10       │  │ 192.168.13.5                     │   │
│ │ (SCSI Target)       │  │ (Guardian Agent)                 │   │
│ └─────────────────────┘  │                                  │   │
│                          │ ┌──────────────────────────────┐ │   │
│ ┌──────────────────────┐ │ │ Frontend Container (Nginx)   │ │   │
│ │ TRUENAS i3210        │ │ │ Port: 10001/tcp              │ │   │ 
│ │ 192.168.13.10        │ │ │ React 18 + Bootstrap 5       │ │   │
│ │ (iSCSI/NAS)          │ │ │                              │ │   │
│ └──────────────────────┘ │ └──────────────────────────────┘ │   │
│                          │ ┌──────────────────────────────┐ │   │
│ ┌──────────────────────┐ │ │ Backend Container (Flask)    │ │   │
│ │ ESP32 Guardian       │ │ │ Port: 5051/tcp               │ │   │
│ │ 192.168.13.50        │ │ │ Gunicorn + psutil + docker   │ │   │
│ │ (Autonomous Monitor) │ │ │ nsenter for host control     │ │   │
│ └──────────────────────┘ │ └──────────────────────────────┘ │   │
│                          │                                  │   │
│                          └──────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Layers

| Layer | Component | Role |
|-------|-----------|------|
| **Web Server** | Nginx | Frontend static asset delivery on port 10001 |
| **Presentation** | React 18 + Bootstrap 5 | Dark-themed responsive dashboard with SPA routing |
| **Reverse Proxy** | Nginx routing | Proxies `/api/*` requests from frontend to backend |
| **API Layer** | Flask + Gunicorn | Secure POST control endpoint, stats API, audit logging on port 5051 |
| **Host Control** | nsenter subprocess | Safely execute shutdown/reboot in host PID namespace |
| **Telemetry** | psutil + docker client | Real-time system metrics and container status |
| **Configuration** | Environment variables | Portable, secret-safe deployment |
| **Deployment** | Docker Compose (2 svc) | Multi-container orchestration with host-network backend |

---

## ✨ Features

### Backend API

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/` | GET | None | Render dashboard |
| `/ping` | GET | None | Health check (returns `DELL_M380_OK`) |
| `/stats` | GET | None | System metrics JSON |
| `/logs` | GET | None | Event log JSON (newest first) |
| `/control` | POST | Password | Execute shutdown/reboot with server-side validation |

### Frontend Dashboard

✅ **Hero Section**
- Host identity display (hostname, IP, online status)
- Last refresh timestamp
- Real-time status pills

✅ **Metrics Grid** (Auto-refresh every 5 seconds)
- Container status (from Docker)
- CPU load percentage
- RAM usage (used/total)
- Disk usage (used/total)
- Uptime (formatted: days/hours/minutes/seconds)
- Running Docker containers count

✅ **Control Panel**
- Large action buttons (Shutdown, Reboot, Ping)
- Modal password confirmation
- Server-side validation with 403 rejection
- Invalid password alert handling

✅ **Live System Log**
- Scrollable event list (max 200 entries)
- Severity badges (info, warning, critical)
- Timestamp and source tracking
- Newest events first

✅ **Telemetry Overview**
- Host identity card
- Container status card
- System uptime card

---

## 🔐 Security

### Authentication & Authorization

1. **Client-Side**: No password exposure in frontend code
2. **Server-Side**: All password validation in Flask backend
3. **Transport**: HTTPS-ready (add reverse proxy in production)
4. **Host Namespace**: Uses `nsenter --target 1` to safely reach host PID=1

### Control Flow

```
┌─────────────────────────────────────────────────────────┐
│ User clicks [SHUTDOWN SERVER]                           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Modal prompts: "Enter Admin Password"                   │
│ Password input sent to /control POST (JSON body)        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Backend validates password == DELL_GUARDIAN_PASSWORD    │
│                                                         │
│ ✓ Valid  → Execute: nsenter --target 1 ... shutdown now│
│ ✗ Invalid→ Return 403 ACCESS_DENIED                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Log event to circular buffer (max 200 entries)          │
│ Return JSON status to frontend                          │
│ Display success/error alert                            │
└─────────────────────────────────────────────────────────┘
```

### Docker Container Hardening

- **Privileged Mode**: Enabled for nsenter access
- **Host PID Namespace**: `pid: host` for process control
- **Host Network**: `network_mode: host` for direct LAN access
- **Read-Only Mounts**: `/proc:/host_proc:ro` for telemetry
- **Docker Socket**: `/var/run/docker.sock` for container enumeration
- **Restricted Binaries**: `/sbin:/usr/sbin` only (not entire /bin, /usr/bin)

---

## 🚀 Installation

### Prerequisites

- Debian 11+ or Ubuntu 20.04+
- Docker and Docker Compose installed
- Python 3.11+ (for local testing)

### Quick Deploy (Portainer)

1. Copy `docker-compose.yml` and `.env` to your Debian host
2. In Portainer, add a new stack
3. Paste the compose file content
4. Set environment variables (see Configuration below)
5. Deploy

### Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/Dell-Guardian-Agent.git
cd Dell-Guardian-Agent

# Configure environment
cp .env.example .env
# Edit .env with your backend password and settings

# Deploy with Docker Compose
docker compose up -d

# Verify both services are running
docker compose ps
# Should show dellguardian-backend (port 5051) and dellguardian-frontend (port 10001)

# Access frontend at http://localhost:10001
# Backend API at http://localhost:5051
```

---

## ⚙️ Configuration

### Environment Variables (Backend only)

**Copy `.env.example` to `.env` and customize:**

```bash
# Backend API Port & Security
PORT=5051
DELL_GUARDIAN_HOSTNAME=Dell M380
DELL_GUARDIAN_IP=192.168.13.5

# Security
DELL_GUARDIAN_PASSWORD=change_me_to_strong_password

# Status
DELL_GUARDIAN_CONTAINER_STATUS=Running

# Logging (optional)
DELL_GUARDIAN_LOG_LIMIT=200
```

### Docker Compose Override

In `.env`, each variable can be overridden:

```bash
export DELL_GUARDIAN_PASSWORD=my_secure_pass_123
export DELL_GUARDIAN_HOSTNAME="Production Dell M380"
docker compose up -d
```

---

## 📡 API Reference

### GET /ping

Health check endpoint.

**Response:**
```json
{
  "status": "DELL_M380_OK"
}
```

### GET /stats

Real-time system metrics.

**Response:**
```json
{
  "hostname": "Dell M380",
  "ip": "192.168.13.5",
  "container_status": "Running",
  "server_time": "2026-05-03 23:12:45",
  "cpu_load_percent": 15.2,
  "ram_usage_percent": 42.5,
  "ram_used": "8.5 GB",
  "ram_total": "20.0 GB",
  "disk_usage_percent": 68.3,
  "disk_used": "340.2 GB",
  "disk_total": "500.0 GB",
  "uptime": "14d 8h 32m 10s",
  "uptime_seconds": 1234930,
  "docker_running_count": 12
}
```

### GET /logs

Event audit log (newest first, max 200 entries).

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2026-05-03 23:12:38",
      "level": "critical",
      "source": "api",
      "message": "Authorized shutdown triggered"
    },
    {
      "timestamp": "2026-05-03 23:12:30",
      "level": "warning",
      "source": "api",
      "message": "Unauthorized shutdown attempt"
    },
    {
      "timestamp": "2026-05-03 23:10:00",
      "level": "info",
      "source": "ui",
      "message": "Dashboard page opened"
    }
  ]
}
```

### POST /control

Execute host control action (shutdown or reboot).

**Request:**
```json
{
  "action": "shutdown",
  "password": "hari1234"
}
```

**Valid Actions:** `shutdown`, `reboot`

**Responses:**

**Success (200):**
```json
{
  "status": "SHUTDOWN_TRIGGERED"
}
```

**Invalid Password (403):**
```json
{
  "status": "ACCESS_DENIED"
}
```

**Invalid Action (400):**
```json
{
  "status": "INVALID_ACTION"
}
```

**Execution Failed (500):**
```json
{
  "status": "ACTION_FAILED"
}
```

---

## 💻 Usage

### Access Dashboard (Frontend)

1. Open browser: `http://<host-ip>:10001` (Nginx frontend)
2. View live metrics (auto-refreshes every 5 seconds)
3. Click control buttons for actions
4. Confirm password in modal

### Monitor Events

- All actions logged to in-memory circular buffer (backend)
- View in "Live System Log" panel on dashboard
- Log persists for container lifetime (reload clears)

### API Integration (Backend)

All API calls are on port **5051** (backend):

```bash
# Check health
curl http://192.168.13.5:5051/ping

# Get stats (JSON)
curl http://192.168.13.5:5051/stats

# Trigger shutdown (requires password)
curl -X POST http://192.168.13.5:5051/control \
  -H "Content-Type: application/json" \
  -d '{"action":"shutdown","password":"hari1234"}'
```

---

## 📁 File Structure

```
Dell-Guardian-Agent/
├── README.md                          # This file
├── app.py                             # Flask backend (API + host control + telemetry)
├── Dockerfile                         # Backend container image (Flask + Gunicorn)
├── Dockerfile.frontend                # Frontend container image (Nginx)
├── nginx.conf                         # Nginx configuration (reverse proxy + SPA)
├── docker-compose.yml                 # Multi-container deployment (hardened)
├── requirements.txt                   # Python dependencies (backend only)
├── .env                               # Configuration (gitignored, backend secrets)
├── .env.example                       # Configuration template
│
├── templates/
│   └── index.html                     # SPA template (served by Nginx)
│
├── static/
│   ├── style.css                      # Dark NOC theme
│   └── app.js                         # React 18 dashboard (embedded CDN)
│
├── Docs/
│   └── dell_guardian_git_hub_readme.md # Extended documentation
│
└── .git/                              # Version control
```

**Services:**
- `dellguardian-backend`: Flask API on port 5051 (host network mode, privileged for nsenter)
- `dellguardian-frontend`: Nginx reverse proxy on port 10001 (standard Docker bridge network)

---

## 🔧 Troubleshooting

### Services won't start

```bash
# Check both services
docker compose ps
docker compose logs

# Check backend logs
docker logs dellguardian-backend

# Check frontend logs
docker logs dellguardian-frontend

# Verify environment variables (backend only)
docker exec dellguardian-backend env | grep DELL_

# Test Flask app directly
docker exec dellguardian-backend python -m py_compile app.py
```

### /control endpoint returns 500

```bash
# Check backend has nsenter
docker exec dellguardian-backend which nsenter

# Check host namespace (backend)
docker exec dellguardian-backend ls -la /proc/1/

# Verify privileged mode (backend)
docker inspect dellguardian-backend | grep -i privileged
```

### Stats showing N/A for docker_running_count

Ensure Docker socket is mounted and readable on backend:
```bash
docker exec dellguardian-backend ls -la /var/run/docker.sock
docker exec dellguardian-backend docker ps
```

### Frontend not loading (port 10001)

Check Nginx frontend container:
```bash
docker logs dellguardian-frontend
curl http://localhost:10001
```

### Backend API unreachable (port 5051)

Check backend connectivity from frontend:
```bash
docker compose exec dellguardian-frontend curl http://dellguardian-backend:5051/ping
```

### Port 10001 or 5051 already in use

Change frontend port in `docker-compose.yml`:
```yaml
dellguardian-frontend:
  ports:
    - "10002:10001"  # Host port : container port
```

Change backend port in `.env`:
```bash
PORT=5052  # or any free port
```

---

## 🐳 Docker Compose Details

Key configuration hardening:

```yaml
services:
  dellguardian:
    network_mode: host          # Direct LAN access
    pid: host                   # Share host PID namespace
    privileged: true            # nsenter capability
    volumes:
      - /var/run/docker.sock    # Docker API access
      - /proc:/host_proc:ro     # Host telemetry
      - /sbin:/usr/sbin         # Power commands
    env_file:
      - .env                    # External config
```

---

## 🚦 Development Status

| Component | Status | Notes |
|-----------|--------|-------|
| Flask Backend | ✅ Production | Server-side validation, nsenter control |
| React Dashboard | ✅ Production | Dark theme, responsive, real-time refresh |
| Docker Deployment | ✅ Production | Portainer-ready, hardened |
| Security Audit | ✅ Complete | POST validation, no client-side secrets |
| Telemetry | ✅ Production | psutil + docker API integration |
| Event Logging | ✅ Production | Circular buffer with severity levels |

---

## 📝 License

[Add your license here]

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📧 Support

For issues, questions, or feature requests:

- Open a GitHub issue
- Check existing documentation in `/Docs`
- Review logs: `docker logs dellguardian`

---

<div align="center">

### ⭐ If this helps you manage your infrastructure, please star this repository!

**Dell Guardian Agent** — Secure. Hardened. Production-Ready.

</div>
