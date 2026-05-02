# 🛡 Dell Guardian Appliance
<div align="center">

![Platform](https://img.shields.io/badge/Platform-ESP32%20%2B%20Arduino%20Uno-blue)
![Backend](https://img.shields.io/badge/Backend-Flask%20%2B%20React-green)
![Deployment](https://img.shields.io/badge/Deployment-Docker%20%2F%20Portainer-orange)
![Monitoring](https://img.shields.io/badge/Monitoring-Telegram%20Alerts-red)
![License](https://img.shields.io/badge/Status-Active%20Development-success)

### Intelligent Autonomous Server Recovery, Monitoring & Remote Control Appliance

</div>

---

## 📸 Project Preview (Add Your Screenshots Here)

```text
/docs/dashboard-preview.png
/docs/hardware-appliance.jpg
/docs/wiring-diagram.png
/docs/dell-agent-ui.png
```

> Replace the above placeholders with real screenshots after assembly for a premium GitHub showcase.

---

# 🚨 Why This Project Exists

Running old unattended home-lab servers comes with one annoying reality:

- machines freeze randomly,
- network stack dies,
- Docker overloads services,
- BIOS hangs after power loss,
- systems shut down when nobody is near.

Software-only watchdogs fail when the entire machine is unreachable.

That created the need for a **hardware-assisted autonomous guardian** that can both:

> observe the machine like monitoring software,

and

> physically press its power button like a human technician.

Thus **Dell Guardian Appliance** was born.

---

# 🎯 What Dell Guardian Does

Dell Guardian is a dedicated sidecar appliance that sits beside your server rack and independently performs:

✅ Network health monitoring  
✅ Physical relay-based power recovery  
✅ Secure software reboot/shutdown  
✅ Telegram incident alerts  
✅ Secondary device monitoring  
✅ ESP32 live dashboard hosting  
✅ Docker host telemetry collection  
✅ Manual admin intervention tools  

It behaves like a miniature autonomous NOC engineer.

---

# 🧠 Full System Topology

```text
                                      ┌────────────────────────────┐
                                      │       Telegram Group       │
                                      │  Alerts • Recovery Logs    │
                                      └─────────────┬──────────────┘
                                                    │ HTTPS API
                                                    │
                               Browser LAN Access   │
                         ┌──────────────────────────┘
                         ▼
                ┌─────────────────────────────┐
                │     ESP32 Guardian Core     │
                │-----------------------------│
                │ WiFi Monitor Engine         │
                │ Recovery State Machine      │
                │ Telegram Notification Core  │
                │ Dell Agent HTTP Client      │
                │ Dynamic Node Monitor        │
                │ Web Dashboard               │
                └────────────┬────────────────┘
                             │ UART Duplex
                             ▼
                  ┌─────────────────────────┐
                  │   Arduino Uno Executor  │
                  │-------------------------│
                  │ Relay Timing Control    │
                  │ ACK/DONE Confirmation   │
                  └──────────┬──────────────┘
                             │
                             ▼
                     ┌───────────────┐
                     │ Relay Module   │
                     │ Power Trigger  │
                     └──────┬─────────┘
                            │
                            ▼
                     ┌───────────────┐
                     │ Dell M380 HW   │
                     │ Physical Button │
                     └───────────────┘

      ┌─────────────────────────────────────────────────────┐
      │        Dell Guardian Agent (Docker on Debian)      │
      │ Flask API + React Dashboard + Host nsenter Control │
      └─────────────────────────────────────────────────────┘

      ┌──────────────────────┐
      │  TRUENAS + Extra LAN │
      │  Passive Monitoring  │
      └──────────────────────┘
```

---

# 🖼 Hardware Wiring Diagram (README Graphic Placeholder)

```text
ESP32 GPIO17 TX2  ─────────────► Arduino Uno D2 RX
ESP32 GPIO16 RX2  ◄───────────── Arduino Uno D3 TX
ESP32 GND         ─────────────► Arduino Uno GND

Arduino Uno Relay1 ────────────► Dell Power Button Short Press
Arduino Uno Relay2 ────────────► Dell Hard Press / Force Hold

ESP32 WiFi ────────────────────► LAN Router
ESP32 HTTP ────────────────────► Dell Guardian Docker Agent
ESP32 HTTPS ───────────────────► Telegram Bot API
```

> Add an actual Fritzing or CAD diagram image in `/docs/wiring-diagram.png`

---

# 🧰 Hardware Bill of Materials

| Qty | Item | Role |
|-----|------|------|
| 1 | ESP32 DevKit V1 | Main Guardian Brain |
| 1 | Arduino Uno | Deterministic Relay Executor |
| 1 | 2CH Relay Module | Physical Server Power Trigger |
| 1 | Passive Buzzer | Audible Fault Alert |
| 3 | Status LEDs | WiFi / Fault / Recovery |
| 1 | Push Button | Manual Local Recovery |
| 1 | PC817 Optocoupler Board | Isolation Sensing |
| 1 | 12V Battery Pack (Optional) | Backup Appliance Power |
| 1 | Dell M380 Debian Host | Primary Server |
| 1 | TRUENAS i3210 | Secondary Passive Node |

---

# ⚙ Feature Matrix

| Feature | Description |
|---------|-------------|
| Primary Health Probe | Poll Dell M380 every 10 sec |
| Recovery Ladder | SHORT → SHORT → HARD |
| Boot Validation | 30 sec boot wait after every trigger |
| Duplex MCU Protocol | ESP32 command + Uno ACK/DONE |
| Telegram Incident Feed | Rich HTML emoji alerts |
| Secure Docker Host Control | nsenter PID1 shutdown/reboot |
| Secondary Node Monitor | TrueNAS offline/restored alerts |
| Dynamic Extra Devices | Add up to 5 passive LAN nodes |
| ESP Dashboard | Full LAN appliance UI |
| Event Logging | Circular incident log |

---

# 🔁 Recovery Logic Flow

```text
Dell Online? ── YES ──► Continue Monitoring
      │
      NO
      ▼
Attempt 1 SHORT PRESS
      │ wait 30 sec
Dell Online?
      │
      ├── YES ► RESTORED ALERT
      │
      NO
      ▼
Attempt 2 SHORT PRESS
      │ wait 30 sec
Dell Online?
      │
      ├── YES ► RESTORED ALERT
      │
      NO
      ▼
Attempt 3 HARD PRESS
      │ wait 30 sec
Dell Online?
      │
      ├── YES ► RESTORED ALERT
      │
      NO
      ▼
CRITICAL FAILURE TELEGRAM ALERT
```

---

# 🔐 Security Layers

### Layer 1 — ESP32 Dashboard Password Gate
Manual shutdown/reboot requires admin password.

### Layer 2 — Docker Backend POST Validation
All host control requests validated server-side.

### Layer 3 — Host Namespace Control
Uses `nsenter --target 1` to securely reach actual Debian host init.

### Layer 4 — LAN Isolated Appliance
ESP32 dashboard can remain on private subnet.

---

# 📁 Repository Layout

```text
DellGuardian/
├── README.md
├── docs/
│   ├── dashboard-preview.png
│   ├── hardware-appliance.jpg
│   ├── wiring-diagram.png
│   └── dell-agent-ui.png
│
├── ESP32_Firmware/
│   ├── GuardianV41.ino
│   ├── globals.h
│   ├── uno_uart.h
│   ├── telegram_engine.h
│   ├── node_monitor.h
│   ├── dell_agent.h
│   └── web_dashboard.h
│
├── Arduino_Uno_Firmware/
│   └── UnoRelayExecutor.ino
│
└── DellGuardianAgent/
    ├── app.py
    ├── Dockerfile
    ├── docker-compose.yml
    ├── requirements.txt
    ├── templates/
    └── static/
```

---

# 🚀 Deployment in 6 Steps

1. Deploy DellGuardianAgent stack in Portainer.
2. Confirm Dell backend `/ping` route works.
3. Upload Uno relay executor firmware.
4. Upload ESP32 Guardian firmware.
5. Connect UART + relays + power.
6. Configure Telegram bot credentials.

Guardian becomes autonomous after this.

---

# 🧪 Suggested GitHub Media to Add

For a professional repository appearance, upload:

- dashboard screenshots
- serial monitor screenshots
- hardware enclosure photos
- relay wiring image
- Telegram alert screenshots
- Dell Agent React dashboard screenshots

This dramatically increases project credibility.

---

# 🔮 Planned V5 Upgrades

- OLED front panel live display
- local audible coded alarms
- lithium battery charging circuit
- WAN outage detection
- cloud tunnel watchdog
- persistent SD/SQLite log storage
- mobile companion app
- PCB custom shield

---

# 🏁 Closing Note

Dell Guardian is a fusion of:

> embedded systems + server monitoring + hardware automation + self-hosting reliability.

A custom-built autonomous technician that sits beside your infrastructure 24/7.

---

<div align="center">

### ⭐ Star this repository if you love self-hosted resilience engineering.

</div>

