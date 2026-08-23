import { useEffect, useState } from "react";
import { getHistory, clearHistory } from "../api";
import Icon from "./Icon";

function HistoryCard({ deviceName, selectedDeviceId }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const name = deviceName || "Pump";

  async function loadHistory() {
    if (!selectedDeviceId) return;

    try {
      const data = await getHistory(selectedDeviceId);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("History Error:", err);
      setHistory([]);
    }
  }

  async function deleteHistory() {
    const ok = window.confirm(
      `क्या आप पूरी $History delete करना चाहते हैं?`
    );

    if (!ok) return;

    try {
      setLoading(true);

      const result = await clearHistory(selectedDeviceId);

      if (result?.success !== false) {
        setHistory([]);
      }
    } catch (err) {
      console.error("Clear History Error:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date) {
    if (!date) return "Unknown";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return String(date);
    }

    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  }

  useEffect(() => {
    setHistory([]);
    loadHistory();

    const timer = setInterval(loadHistory, 5000);

    return () => clearInterval(timer);
  }, [selectedDeviceId]);

  return (
      <div style={{ padding: "20px" }}>

        <button
          type="button"
          className="accordion-header history-accordion-header"
          onClick={() => setHistoryOpen((v) => !v)}
          aria-expanded={historyOpen}
        >
          <span className="accordion-title">
            <Icon name="history" size={20} />
            History
          </span>

          <span
            className={`premium-accordion-arrow ${historyOpen ? "is-open" : ""}`}
            aria-hidden="true"
          />
        </button>

        <div
          className={`accordion-content history-accordion-content ${
            historyOpen
              ? "accordion-content-open"
              : "accordion-content-closed"
          }`}
        >

          <div className="history-clear-action">
            <button
              type="button"
              onClick={deleteHistory}
              disabled={loading || history.length === 0}
              style={{
                background: history.length === 0 ? "#ccc" : "#d32f2f",
                color: "white",
                border: "none",
                borderRadius: "20px",
                padding: "10px 18px",
                fontSize: "15px",
                cursor:
                  history.length === 0 ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Clearing..." : "Clear History"}
            </button>
          </div>

          <div style={{ marginTop: "18px" }}>
          <p style={{ color: "#666", marginTop: 0 }}>
            Latest {name} ON/OFF activity
          </p>

          <hr />

          {history.length === 0 ? (
            <div className="history-empty-state">
              <p>No History Found</p>
            </div>
          ) : (
            <div>
              {history.map((item, index) => {
                const isOn =
                  String(item.command || "").toUpperCase() === "ON";

                return (
                  <div
                    key={
                      item.$id ||
                      `${item.createdAt}-${index}`
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                      padding: "14px 10px",
                      marginBottom: "8px",
                      borderRadius: "10px",
                      background: isOn
                        ? "#f1f8f3"
                        : "#fff3f3",
                      border: isOn
                        ? "1px solid #c8e6c9"
                        : "1px solid #ffcdd2"
                    }}
                  >
                    <Icon
                      name="power"
                      size={28}
                    />

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "bold"
                        }}
                      >
                        {name} {isOn ? "ON" : "OFF"}
                      </div>

                      <div
                        style={{
                          color: "#666",
                          fontSize: "14px",
                          marginTop: "4px"
                        }}
                      >
                        {formatDate(item.createdAt)}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "bold",
                        color: isOn
                          ? "#2e7d32"
                          : "#c62828"
                      }}
                    >
                      {item.result === "Completed"
                        ? "Completed"
                        : item.result || "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryCard;
