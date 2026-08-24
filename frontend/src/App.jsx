import { useEffect, useState } from "react";

import Header from "./components/Header";
import ManualControl from "./components/ManualControl";
import Schedule from "./components/Schedule";
import HistoryCard from "./components/HistoryCard";
import StatsCard from "./components/StatsCard";
import DeviceConnection from "./components/DeviceConnection";
import Login from "./components/Login";
import "./App.css";

import { authFetch } from "./api";
import DeviceSelector from "./components/DeviceSelector";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  const [user, setUser] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("PUMP001");
  const [deviceName, setDeviceName] = useState("PUMP001");
  const [deviceLoading, setDeviceLoading] = useState(false);

  async function loadDeviceName(deviceId = selectedDeviceId) {
    if (!deviceId) return;

    try {
      const res = await authFetch(
        `/api/device/${deviceId}?t=${Date.now()}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        throw new Error("Device API error");
      }

      const data = await res.json();

      setDeviceName(
        data.deviceName ||
        data.deviceId ||
        deviceId
      );
    } catch (err) {
      console.error("Device name error:", err);
    }
  }

  function refreshStatus() {
    setRefresh(prev => !prev);
    loadDeviceName(selectedDeviceId);
  }

  async function handleDeviceChange(deviceId) {
    if (!deviceId) return;

    // Purane device ka data turant hide karke skeleton dikhao
    setDeviceLoading(true);
    setDeviceName("");
    setSelectedDeviceId(deviceId);
    setRefresh(prev => !prev);

    try {
      await loadDeviceName(deviceId);
    } finally {
      // Naye device ka naam/data load hone ke baad skeleton hatao
      setDeviceLoading(false);
    }
  }

  useEffect(() => {
    if (!user || !selectedDeviceId) return;

    loadDeviceName(selectedDeviceId);

    const timer = setInterval(
      () => loadDeviceName(selectedDeviceId),
      5000
    );

    return () => clearInterval(timer);
  }, [user, selectedDeviceId]);

  if (!user) {
    return (
      <ErrorBoundary>
        <Login onLogin={setUser} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="dashboard">

      <Header deviceName={deviceName} />

      <DeviceSelector
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={handleDeviceChange} refresh={refresh}
      />

      {deviceLoading ? (
        <div className="device-switch-skeleton" aria-label="Loading device">
          <div className="skeleton-card">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-block" />
            <div className="skeleton-line skeleton-short" />
            <div className="skeleton-button" />
          </div>

          <div className="skeleton-card">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-block skeleton-chart" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-short" />
          </div>

          <div className="skeleton-card">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-block skeleton-form" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-short" />
          </div>

          <div className="skeleton-card skeleton-full">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-block skeleton-history" />
            <div className="skeleton-line" />
          </div>
        </div>
      ) : (
        <div className="grid">

          <div className="card">
            <ManualControl
              onCommandSent={refreshStatus}
              deviceName={deviceName}
              selectedDeviceId={selectedDeviceId}
            />
          </div>

          <div className="card">
            <StatsCard
              refresh={refresh}
              deviceName={deviceName}
              selectedDeviceId={selectedDeviceId}
            />
          </div>

          <div className="card">
            <Schedule
              refresh={refresh}
              deviceName={deviceName}
              selectedDeviceId={selectedDeviceId}
            />
          </div>

          <div className="card full">
            <HistoryCard
              deviceName={deviceName}
              selectedDeviceId={selectedDeviceId}
            />
          </div>

        </div>
      )}

      </div>
    </ErrorBoundary>
  );
}

export default App;
