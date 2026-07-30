import { useEffect, useState } from "react";
import { getStatus } from "../api";

function StatusCard() {
  const [status, setStatus] = useState("Loading...");
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadStatus() {
    try {
      const data = await getStatus("PUMP001");

      if (data.success) {
        setStatus(data.status || "Unknown");
      } else {
        setStatus("Offline");
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setStatus("Server Offline");
    }
  }

  useEffect(() => {
    loadStatus();

    const timer = setInterval(loadStatus, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "15px",
        marginBottom: "20px",
      }}
    >
      <h2>📡 Pump Status</h2>

      <h3>{status}</h3>

      <p>Last Updated: {lastUpdated}</p>

      <button onClick={loadStatus}>
        🔄 Refresh
      </button>
    </div>
  );
}

export default StatusCard;
