import { useEffect, useState } from "react";
import { getStats } from "../api";
import Icon from "./Icon";

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
