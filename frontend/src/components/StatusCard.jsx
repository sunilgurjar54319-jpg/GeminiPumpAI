import { useEffect, useState } from "react";

function StatusCard({ refresh }) {
  const [status, setStatus] = useState("OFF");
  const [updated, setUpdated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        "https://geminipumpai.onrender.com/api/status/PUMP001",
        {
          cache: "no-store"
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

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

  return (
    <div className="status-card">

      <h2>📡 Pump Status</h2>

      <div
        className={
          status === "ON"
            ? "status-on"
            : "status-off"
        }
      >
        {status === "ON"
          ? "🟢 Pump Running"
          : "🔴 Pump Stopped"}
      </div>

      <p>
        Last Updated:
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
