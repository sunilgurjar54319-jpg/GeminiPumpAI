import { useEffect, useState } from "react";

function StatusCard({ refresh }) {

  const [status, setStatus] = useState("OFF");
  const [updated, setUpdated] = useState("");

  async function loadStatus() {

    try {

      const res = await fetch(
        "http://localhost:5001/api/status/PUMP001"
      );

      const data = await res.json();

      if (data.status) {
        setStatus(data.status);
      }

      if (data.updatedAt) {
        setUpdated(
          new Date(data.updatedAt).toLocaleString("en-IN")
        );
      }

    } catch (error) {

      console.log(error);

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

        {
          status === "ON"
            ? "🟢 Pump Running"
            : "🔴 Pump Stopped"
        }

      </div>

      <p>

        Last Updated:

        <br />

        {updated || "Waiting..."}

      </p>

      <button onClick={loadStatus}>
        🔄 Refresh
      </button>

    </div>

  );

}

export default StatusCard;
