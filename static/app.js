(function () {
  const e = React.createElement;
  function App() {
    const [stats, setStats] = React.useState(null);
    const [logs, setLogs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [pageAlert, setPageAlert] = React.useState(null);
    const [pendingAction, setPendingAction] = React.useState(null);
    const [password, setPassword] = React.useState("");
    const [modalAlert, setModalAlert] = React.useState(null);
    const modalRef = React.useRef(null);

    const refreshData = React.useCallback(async () => {
      try {
        const [statsResponse, logsResponse] = await Promise.all([
          fetch("/api/stats", { cache: "no-store" }),
          fetch("/api/logs", { cache: "no-store" })
        ]);
        const statsPayload = await statsResponse.json();
        const logsPayload = await logsResponse.json();
        setStats(statsPayload);
        setLogs(Array.isArray(logsPayload.logs) ? logsPayload.logs : []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }, []);

    React.useEffect(() => {
      refreshData();
      const timer = window.setInterval(refreshData, 5000);
      return () => window.clearInterval(timer);
    }, [refreshData]);

    React.useEffect(() => {
      const timer = window.setTimeout(() => setPageAlert(null), 3800);
      return () => window.clearTimeout(timer);
    }, [pageAlert]);

    async function pingServer() {
      try {
        const response = await fetch("/api/ping", { cache: "no-store" });
        const payload = await response.json();
        setPageAlert({
          type: response.ok ? "success" : "danger",
          text: `Ping: ${payload.status}`
        });
        refreshData();
      } catch (error) {
        setPageAlert({ type: "danger", text: "Ping failed." });
      }
    }

    function openAction(action) {
      setPendingAction(action);
      setPassword("");
      setModalAlert(null);
      setTimeout(() => {
        if (modalRef.current && window.bootstrap) {
          const modal = window.bootstrap.Modal.getOrCreateInstance(modalRef.current);
          modal.show();
        }
      }, 0);
    }

    function closeAction() {
      setPendingAction(null);
      setPassword("");
      setModalAlert(null);
      if (modalRef.current && window.bootstrap) {
        const modal = window.bootstrap.Modal.getInstance(modalRef.current);
        if (modal) modal.hide();
      }
    }

    async function submitAction(event) {
      event.preventDefault();
      if (!pendingAction) return;

      try {
        const response = await fetch("/api/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ action: pendingAction, password })
        });
        const payload = await response.json();

        if (response.status === 403) {
          setModalAlert("Invalid password. Action blocked.");
          return;
        }

        setPageAlert({
          type: response.ok ? "success" : "danger",
          text: payload.status || "Action completed."
        });
        if (response.ok) {
          closeAction();
        }
        refreshData();
      } catch (error) {
        setPageAlert({ type: "danger", text: "Action failed. Check server logs." });
      }
    }

    return e("div", { style: { padding: 28, color: "var(--text)", fontFamily: "Inter,system-ui,sans-serif", maxWidth: "1200px" } },
      e("h1", null, "Dell Guardian Agent"),
      e("p", null, "Live System Metrics & Control"),
      
      loading ? e("p", null, "Loading...") : (
        e("div", null,
          e("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "20px" } },
            stats && [
              {
                icon: "🖥️",
                label: "CPU Load",
                value: `${stats.cpu_load_percent}%`
              },
              {
                icon: "🧠",
                label: "RAM Usage",
                value: `${stats.ram_usage_percent}%`,
                sub: `${stats.ram_used} / ${stats.ram_total}`
              },
              {
                icon: "💾",
                label: "Disk Usage",
                value: `${stats.disk_usage_percent}%`,
                sub: `${stats.disk_used} / ${stats.disk_total}`
              },
              {
                icon: "⏱️",
                label: "Uptime",
                value: stats.uptime || "--"
              },
              {
                icon: "🐳",
                label: "Containers",
                value: stats.docker_running_count || "N/A"
              },
              {
                icon: "✅",
                label: "Status",
                value: stats.container_status || "Running"
              }
            ].map((card) => e("div", { key: card.label, style: { padding: "16px", border: "1px solid #444", borderRadius: "8px", backgroundColor: "#1a1a1a" } },
              e("div", { style: { fontSize: "20px" } }, card.icon),
              e("div", { style: { fontSize: "12px", color: "#888", marginTop: "8px" } }, card.label),
              e("div", { style: { fontSize: "24px", fontWeight: "bold", marginTop: "4px" } }, card.value),
              card.sub ? e("div", { style: { fontSize: "12px", color: "#aaa", marginTop: "8px" } }, card.sub) : null
            ))
          ),
          e("div", { style: { marginTop: "40px", padding: "20px", border: "1px solid #555", borderRadius: "8px", backgroundColor: "#0a0a0a" } },
            e("h2", { style: { marginTop: 0 } }, "Control Actions"),
            e("p", { style: { color: "#aaa", marginBottom: "20px" } }, "Click an action below. Password will be required."),
            e("div", { style: { display: "flex", gap: "12px", flexWrap: "wrap" } },
              e("button", {
                onClick: () => openAction("shutdown"),
                style: { padding: "12px 20px", backgroundColor: "#8b0000", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }
              }, "🛑 Shutdown Server"),
              e("button", {
                onClick: () => openAction("reboot"),
                style: { padding: "12px 20px", backgroundColor: "#ff8c00", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }
              }, "🔄 Reboot Server"),
              e("button", {
                onClick: pingServer,
                style: { padding: "12px 20px", backgroundColor: "#0066cc", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }
              }, "📡 Ping Test")
            )
          ),

          e("div", { style: { marginTop: "40px", padding: "20px", border: "1px solid #555", borderRadius: "8px", backgroundColor: "#0a0a0a" } },
            e("h2", { style: { marginTop: 0, marginBottom: "16px" } }, `Live System Log (${logs.length} entries)`),
            e("div", { style: { maxHeight: "300px", overflowY: "auto", backgroundColor: "#1a1a1a", borderRadius: "6px", padding: "12px" } },
              logs.length ? logs.map((item, index) =>
                e("div", { key: `${item.timestamp}-${index}`, style: { padding: "8px", borderBottom: "1px solid #333", fontSize: "12px", color: "#ccc" } },
                  e("div", { style: { fontWeight: "bold", color: item.level === "critical" ? "#ff6b6b" : item.level === "warning" ? "#ffa500" : "#4fc3f7" } }, `${item.level.toUpperCase()} - ${item.source}`),
                  e("div", { style: { marginTop: "4px" } }, item.message),
                  e("div", { style: { color: "#666", marginTop: "4px", fontSize: "11px" } }, item.timestamp)
                )
              ) : e("div", { style: { color: "#666", textAlign: "center", padding: "20px" } }, "No events recorded yet.")
            )
          ),

          e("div", { style: { marginTop: "40px", padding: "20px", border: "1px solid #555", borderRadius: "8px", backgroundColor: "#0a0a0a" } },
            e("h2", { style: { marginTop: 0, marginBottom: "20px" } }, "Telemetry Overview"),
            e("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" } },
              e("div", { style: { padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "6px", border: "1px solid #444" } },
                e("div", { style: { fontSize: "12px", color: "#888" } }, "Host Identity"),
                e("div", { style: { fontSize: "18px", fontWeight: "bold", marginTop: "8px" } }, "Dell M380"),
                e("div", { style: { fontSize: "12px", color: "#aaa", marginTop: "8px" } }, "192.168.13.5")
              ),
              e("div", { style: { padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "6px", border: "1px solid #444" } },
                e("div", { style: { fontSize: "12px", color: "#888" } }, "Container Status"),
                e("div", { style: { fontSize: "18px", fontWeight: "bold", marginTop: "8px", color: "#4fc3f7" } }, stats ? stats.container_status : "Running"),
                e("div", { style: { fontSize: "12px", color: "#aaa", marginTop: "8px" } }, "Managed deployment")
              ),
              e("div", { style: { padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "6px", border: "1px solid #444" } },
                e("div", { style: { fontSize: "12px", color: "#888" } }, "Last Updated"),
                e("div", { style: { fontSize: "18px", fontWeight: "bold", marginTop: "8px" } }, stats ? stats.server_time : "--"),
                e("div", { style: { fontSize: "12px", color: "#aaa", marginTop: "8px" } }, "Refreshed every 5 seconds")
              )
            )
          )
        )
      ),
      
      e("div", {
        className: "modal fade",
        id: "passwordModal",
        tabIndex: "-1",
        ref: modalRef,
        "aria-hidden": "true",
        style: { display: pendingAction ? "block" : "none", backgroundColor: "rgba(0,0,0,0.5)" }
      },
        e("div", { style: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px solid #444", padding: "24px", maxWidth: "400px", width: "90%", zIndex: 9999 } },
          e("h2", { style: { marginTop: 0, color: "white" } }, pendingAction ? `${pendingAction.toUpperCase()} Confirmation` : "Admin Confirmation"),
          e("p", { style: { color: "#aaa" } }, "Enter Admin Password"),
          e("form", { onSubmit: submitAction, style: { display: "flex", flexDirection: "column", gap: "12px" } },
            e("input", {
              type: "password",
              value: password,
              onChange: (event) => setPassword(event.target.value),
              placeholder: "Admin password",
              autoFocus: true,
              style: { padding: "10px", backgroundColor: "#0a0a0a", color: "white", border: "1px solid #444", borderRadius: "6px", fontSize: "14px" }
            }),
            modalAlert ? e("div", { style: { backgroundColor: "#8b0000", color: "white", padding: "12px", borderRadius: "6px", fontSize: "14px" } }, modalAlert) : null,
            e("div", { style: { display: "flex", gap: "12px", marginTop: "12px" } },
              e("button", {
                type: "button",
                onClick: closeAction,
                style: { padding: "10px 16px", backgroundColor: "#444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", flex: 1 }
              }, "Cancel"),
              e("button", {
                type: "submit",
                style: { padding: "10px 16px", backgroundColor: "#0066cc", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", flex: 1, fontWeight: "bold" }
              }, "Confirm Action")
            )
          )
        )
      ),

      pageAlert ? e("div", { style: { 
        position: "fixed", 
        bottom: "20px", 
        right: "20px", 
        padding: "16px 24px", 
        borderRadius: "6px", 
        backgroundColor: pageAlert.type === "success" ? "#28a745" : "#dc3545",
        color: "white",
        fontWeight: "bold",
        maxWidth: "300px"
      } }, pageAlert.text) : null
    );
  }
  const container = ReactDOM.createRoot(document.getElementById("root"));
  container.render(e(App));
})();