(function () {
  const bootstrapData = window.DELL_GUARDIAN_BOOTSTRAP || {};
  const e = React.createElement;

  function formatTime(value) {
    if (!value) {
      return "--";
    }
    return value;
  }

  function App() {
    const [stats, setStats] = React.useState(null);
    const [logs, setLogs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [pageAlert, setPageAlert] = React.useState(null);
    const [modalAlert, setModalAlert] = React.useState(null);
    const [pendingAction, setPendingAction] = React.useState(null);
    const [password, setPassword] = React.useState("");
    const modalRef = React.useRef(null);
    const modalInstanceRef = React.useRef(null);

    const refreshData = React.useCallback(async () => {
      try {
        const [statsResponse, logsResponse] = await Promise.all([
          fetch("/stats", { cache: "no-store" }),
          fetch("/logs", { cache: "no-store" })
        ]);

        const statsPayload = await statsResponse.json();
        const logsPayload = await logsResponse.json();
        setStats(statsPayload);
        setLogs(Array.isArray(logsPayload.logs) ? logsPayload.logs : []);
      } catch (error) {
        setPageAlert({ type: "danger", text: "Unable to refresh server metrics." });
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
      if (!modalRef.current || !window.bootstrap) {
        return;
      }
      modalInstanceRef.current = window.bootstrap.Modal.getOrCreateInstance(modalRef.current, {
        backdrop: "static",
        keyboard: false
      });
    }, []);

    React.useEffect(() => {
      const timer = window.setTimeout(() => setPageAlert(null), 3800);
      return () => window.clearTimeout(timer);
    }, [pageAlert]);

    React.useEffect(() => {
      if (pendingAction && modalInstanceRef.current) {
        modalInstanceRef.current.show();
      }
      if (!pendingAction && modalInstanceRef.current) {
        modalInstanceRef.current.hide();
      }
    }, [pendingAction]);

    async function pingServer() {
      try {
        const response = await fetch("/ping", { cache: "no-store" });
        const payload = await response.json();
        setPageAlert({
          type: response.ok ? "success" : "danger",
          text: `Ping response: ${payload.status}`
        });
        refreshData();
      } catch (error) {
        setPageAlert({ type: "danger", text: "Ping failed." });
      }
    }

    function openControl(action) {
      setPendingAction(action);
      setPassword("");
      setModalAlert(null);
    }

    function closeControl() {
      setPendingAction(null);
      setPassword("");
      setModalAlert(null);
    }

    async function submitControl(event) {
      event.preventDefault();

      const action = pendingAction;
      if (!action) {
        return;
      }

      try {
        const response = await fetch("/control", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          cache: "no-store",
          body: JSON.stringify({ action, password })
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
          closeControl();
        }
        refreshData();
      } catch (error) {
        setPageAlert({ type: "danger", text: "Action failed. Check server logs." });
      }
    }

    const lastUpdated = stats ? formatTime(stats.server_time) : "--";
    const dockerCount = stats && stats.docker_running_count !== null && stats.docker_running_count !== undefined
      ? stats.docker_running_count
      : "N/A";

    return e("div", { className: "app-shell" },
      e("div", { className: "container-fluid" },
        e("div", { className: "hero mb-4" },
          e("div", { className: "hero-inner" },
            e("div", { className: "eyebrow" },
              e("i", { className: "fa-solid fa-shield-halved" }),
              "Secure Host Control"
            ),
            e("div", { className: "dashboard-title" }, bootstrapData.dashboardTitle || "Dell Guardian Agent Control Center"),
            e("p", { className: "subtitle" },
              "A hardened server control surface for the Dell M380 host with live telemetry, audit logging, and guarded power actions."
            ),
            e("div", { className: "status-row" },
              e("span", { className: "status-pill" }, e("span", { className: "status-dot" }), "Host online"),
              e("span", { className: "status-pill" }, e("i", { className: "fa-solid fa-laptop-code text-info" }), `Hostname: ${bootstrapData.displayName || "Dell M380"}`),
              e("span", { className: "status-pill" }, e("i", { className: "fa-solid fa-network-wired text-info" }), `IP: ${bootstrapData.displayIp || "192.168.13.5"}`),
              e("span", { className: "status-pill" }, e("i", { className: "fa-solid fa-clock text-info" }), `Last refresh: ${lastUpdated}`)
            )
          )
        ),
        e("div", { className: "row g-4" },
          e("div", { className: "col-12 col-xxl-8" },
            e("div", { className: "row g-4" },
              [
                {
                  icon: "fa-solid fa-server",
                  label: "Container Status",
                  value: stats ? stats.container_status : loading ? "Loading..." : "--",
                  subtext: "Docker runtime state"
                },
                {
                  icon: "fa-solid fa-microchip",
                  label: "CPU Load",
                  value: stats ? `${stats.cpu_load_percent}%` : loading ? "Loading..." : "--",
                  subtext: "Rolling system load snapshot"
                },
                {
                  icon: "fa-solid fa-memory",
                  label: "RAM Usage",
                  value: stats ? `${stats.ram_usage_percent}%` : loading ? "Loading..." : "--",
                  subtext: stats ? `${stats.ram_used} / ${stats.ram_total}` : "Memory usage metrics"
                },
                {
                  icon: "fa-solid fa-hard-drive",
                  label: "Disk Usage",
                  value: stats ? `${stats.disk_usage_percent}%` : loading ? "Loading..." : "--",
                  subtext: stats ? `${stats.disk_used} / ${stats.disk_total}` : "Disk occupancy"
                },
                {
                  icon: "fa-solid fa-hourglass-half",
                  label: "Uptime",
                  value: stats ? stats.uptime : loading ? "Loading..." : "--",
                  subtext: "Time since last host boot"
                },
                {
                  icon: "fa-brands fa-docker",
                  label: "Running Containers",
                  value: dockerCount,
                  subtext: "Detected via Docker socket or CLI"
                }
              ].map((card) => e("div", { className: "col-12 col-md-6", key: card.label },
                e("div", { className: "stat-card" },
                  e("div", { className: "metric-icon" }, e("i", { className: card.icon })),
                  e("div", { className: "stat-label" }, card.label),
                  e("div", { className: "stat-value" }, card.value),
                  e("div", { className: "stat-subtext" }, card.subtext)
                )
              )))
            )
          ),
          e("div", { className: "col-12 col-xxl-4" },
            e("div", { className: "control-panel mb-4" },
              e("div", { className: "section-heading" },
                e("div", null,
                  e("h2", { className: "section-title" }, "Control Actions"),
                  e("div", { className: "section-meta" }, "Administrative control requires password confirmation")
                ),
                e("span", { className: "badge badge-soft rounded-pill px-3 py-2" }, "Protected")
              ),
              e("div", { className: "control-actions" },
                e("button", {
                  className: "control-btn btn-shutdown",
                  onClick: () => openControl("shutdown")
                }, e("i", { className: "fa-solid fa-power-off me-2" }), "Shutdown Server"),
                e("button", {
                  className: "control-btn btn-reboot",
                  onClick: () => openControl("reboot")
                }, e("i", { className: "fa-solid fa-rotate-right me-2" }), "Reboot Server"),
                e("button", {
                  className: "control-btn btn-ping",
                  onClick: pingServer
                }, e("i", { className: "fa-solid fa-satellite-dish me-2" }), "Ping Test")
              )
            ),
            e("div", { className: "log-panel" },
              e("div", { className: "section-heading" },
                e("div", null,
                  e("h2", { className: "section-title" }, "Live System Log"),
                  e("div", { className: "section-meta" }, "Newest events first")
                ),
                e("span", { className: "badge badge-soft rounded-pill px-3 py-2" }, `${logs.length} entries`)
              ),
              e("div", { className: "log-list" },
                logs.length ? logs.map((item, index) =>
                  e("div", { className: "log-item", key: `${item.timestamp}-${index}` },
                    e("div", { className: "log-badge" },
                      e("i", { className: item.level === "critical" ? "fa-solid fa-triangle-exclamation" : item.level === "warning" ? "fa-solid fa-circle-exclamation" : "fa-solid fa-wave-square" })
                    ),
                    e("div", null,
                      e("div", { className: "log-title" }, item.message),
                      e("div", { className: "log-meta" }, `${item.timestamp} • ${item.source.toUpperCase()} • ${item.level.toUpperCase()}`)
                    )
                  )
                ) : e("div", { className: "text-muted-soft" }, "No events recorded yet.")
              )
            )
          )
        ),
        e("div", { className: "row g-4 mt-1" },
          e("div", { className: "col-12" },
            e("div", { className: "detail-card" },
              e("div", { className: "section-heading" },
                e("h2", { className: "section-title mb-0" }, "Telemetry Overview"),
                e("span", { className: "section-meta" }, stats ? `Server time: ${stats.server_time}` : "Awaiting initial metrics")
              ),
              e("div", { className: "row g-3" },
                e("div", { className: "col-12 col-md-4" },
                  e("div", { className: "p-3 rounded-4 bg-dark bg-opacity-25 border border-white border-opacity-10 h-100" },
                    e("div", { className: "stat-label" }, "Host identity"),
                    e("div", { className: "stat-value fs-4" }, bootstrapData.displayName || "Dell M380"),
                    e("div", { className: "stat-subtext" }, bootstrapData.displayIp || "192.168.13.5")
                  )
                ),
                e("div", { className: "col-12 col-md-4" },
                  e("div", { className: "p-3 rounded-4 bg-dark bg-opacity-25 border border-white border-opacity-10 h-100" },
                    e("div", { className: "stat-label" }, "Container status"),
                    e("div", { className: "stat-value fs-4" }, stats ? stats.container_status : "Running"),
                    e("div", { className: "stat-subtext" }, "Managed inside Portainer-friendly Docker deployment")
                  )
                ),
                e("div", { className: "col-12 col-md-4" },
                  e("div", { className: "p-3 rounded-4 bg-dark bg-opacity-25 border border-white border-opacity-10 h-100" },
                    e("div", { className: "stat-label" }, "System uptime"),
                    e("div", { className: "stat-value fs-4" }, stats ? stats.uptime : "--"),
                    e("div", { className: "stat-subtext" }, "Updated every 5 seconds")
                  )
                )
              )
            )
          )
        )
      ),
      pageAlert ? e("div", { className: `floating-alert ${pageAlert.type}` }, pageAlert.text) : null,
      e("div", {
        className: "modal fade",
        id: "passwordModal",
        tabIndex: "-1",
        ref: modalRef,
        "aria-hidden": "true"
      },
        e("div", { className: "modal-dialog modal-dialog-centered" },
          e("div", { className: "modal-content" },
            e("div", { className: "modal-header" },
              e("h5", { className: "modal-title" }, pendingAction ? `${pendingAction.toUpperCase()} Confirmation` : "Admin Confirmation"),
              e("button", { type: "button", className: "btn-close btn-close-white", onClick: closeControl })
            ),
            e("form", { onSubmit: submitControl },
              e("div", { className: "modal-body" },
                e("p", { className: "text-muted-soft mb-3" }, "Enter Admin Password"),
                e("input", {
                  className: "form-control form-control-lg",
                  type: "password",
                  value: password,
                  onChange: (event) => setPassword(event.target.value),
                  placeholder: "Admin password",
                  autoFocus: true
                }),
                modalAlert ? e("div", { className: "alert alert-danger mt-3 mb-0" }, modalAlert) : null
              ),
              e("div", { className: "modal-footer" },
                e("button", { type: "button", className: "btn btn-outline-light", onClick: closeControl }, "Cancel"),
                e("button", { type: "submit", className: "btn btn-info fw-bold text-dark" }, "Confirm Action")
              )
            )
          )
        )
      )
    );
  }

  const container = ReactDOM.createRoot(document.getElementById("root"));
  container.render(e(App));
})();