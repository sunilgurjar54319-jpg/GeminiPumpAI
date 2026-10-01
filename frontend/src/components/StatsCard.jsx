import { useEffect, useState } from "react";
import { getStats } from "../api";
import Icon from "./Icon";
import { client, APPWRITE_DATABASE_ID } from "../appwrite";

function StatsCard({ refresh, deviceName, selectedDeviceId }) {
  const [stats, setStats] = useState(null);
  const [statsOpen, setStatsOpen] = useState(false);

  async function load() {
    try {
      const data = await getStats(selectedDeviceId);
      setStats(data);
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    if (!selectedDeviceId) return;

    const channel =
      `databases.${APPWRITE_DATABASE_ID}.collections.history.documents`;

    const unsubscribe = client.subscribe(channel, response => {
      const item = response.payload;

      if (!item?.$id || item.deviceId !== selectedDeviceId) return;

      const events = response.events || [];
      const isDelete = events.some(event =>
        event.endsWith(".delete")
      );

      setStats(prev => {
        if (!prev) return prev;

        if (isDelete) {
          if (String(item.command || "").toUpperCase() === "ON") {
            return {
              ...prev,
              totalON: Math.max(0, prev.totalON - 1),
              totalRecords: Math.max(0, prev.totalRecords - 1)
            };
          }

          if (String(item.command || "").toUpperCase() === "OFF") {
            return {
              ...prev,
              totalOFF: Math.max(0, prev.totalOFF - 1),
              totalRecords: Math.max(0, prev.totalRecords - 1)
            };
          }

          return prev;
        }

        const isCreate = events.some(event =>
          event.endsWith(".create")
        );

        if (isCreate) {
          if (String(item.command || "").toUpperCase() === "ON") {
            return {
              ...prev,
              totalON: prev.totalON + 1,
              totalRecords: prev.totalRecords + 1
            };
          }

          if (String(item.command || "").toUpperCase() === "OFF") {
            return {
              ...prev,
              totalOFF: prev.totalOFF + 1,
              totalRecords: prev.totalRecords + 1
            };
          }
        }

        return prev;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [selectedDeviceId]);

  useEffect(() => {
    setStats(null);
    load();
  }, [refresh, selectedDeviceId]);

  return (
    <div className="stats-card">
      <button
        type="button"
        className="accordion-header stats-header premium-button-press"
        onClick={() => setStatsOpen((v) => !v)}
        aria-expanded={statsOpen}
      >
        <span className="accordion-title">
          <Icon name="stats" size={20} />
          <span>Statistics</span>
        </span>

        <span
          className={`premium-accordion-arrow ${statsOpen ? "is-open" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div
        className={`accordion-content stats-accordion-content ${
          statsOpen ? "accordion-content-open" : "accordion-content-closed"
        }`}
      >
        <div className="stats-accordion-inner">

        <div className="stats-content">
          {!stats ? (
            <p className="stats-loading">Loading...</p>
          ) : (
            <div className="stats-row">
              <div className="stats-item">
                <span className="stats-label">ON</span>
                <span className="stats-number">{stats.totalON}</span>
              </div>

              <div className="stats-divider" />

              <div className="stats-item">
                <span className="stats-label">OFF</span>
                <span className="stats-number">{stats.totalOFF}</span>
              </div>

              <div className="stats-divider" />

              <div className="stats-item">
                <span className="stats-label">Total</span>
                <span className="stats-number">{stats.totalRecords}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default StatsCard;
