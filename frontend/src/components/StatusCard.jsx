import { useEffect, useState } from "react";
import { getStatus } from "../api";

function StatusCard({ refresh }) {
  const [status, setStatus] = useState("OFF");
  const [updated, setUpdated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      setLoading(true);
      setError("");

      const data = await getStatus("PUMP001");

      console.log("Status API:", data);

      if (data.success === false) {
        throw new Error(data.message || "Status API failed");
      }

      if (data.status) {
        setStatus(String(data.status).toUpperCase());
      }

      if (data.updatedAt) {
        setUpdated(
          new Date(data.updatedAt).toLocaleString("en-IN")
        );
      }

    } catch (err) {
      console.log("Status Error:", err);
      setError("❌ Status update नहीं हो पाया");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();

    const timer = setInterval(() => {
      loadStatus();
    }, 3000);

    return () => clearInterval(timer);
  }, [refresh]);

  const isOn = status === "ON";

  return (
    <div className="status-card">

      <h2>📡 Pump Status</h2>

      <div
        className={isOn ? "status-on" : "status-off"}
      >
        {isOn
          ? "🟢 Pump Running"
          : "🔴 Pump Stopped"}
      </div>

      <p>
        <strong>Device:</strong> PUMP001
        <br />
        <strong>Status:</strong>{" "}
        {isOn ? "ON" : "OFF"}
        <br />
        <strong>Last Updated:</strong>
        <br />
        {updated || "Waiting..."}
      </p>

      <button
        onClick={loadStatus}
        disabled={loading}
      >
        {loading
          ? "⏳ Refreshing..."
          : "🔄 Refresh"}
      </button>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

    </div>
  );
}

export default StatusCard;
