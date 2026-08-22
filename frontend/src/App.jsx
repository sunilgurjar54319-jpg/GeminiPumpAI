import { useEffect, useState } from "react";

import Header from "./components/Header";
import StatusCard from "./components/StatusCard";
import ManualControl from "./components/ManualControl";
import VoiceControl from "./components/VoiceControl";
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

  async function loadDeviceName(deviceId = selectedDeviceId) {
    if (!deviceId) return;

    try {
      const res = await authFetch(
        `/api/device/id/${deviceId}?t=${Date.now()}`,
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

  function handleDeviceChange(deviceId) {
    setSelectedDeviceId(deviceId);
    setDeviceName(deviceId || "Device");
    setRefresh(prev => !prev);

    if (deviceId) {
      loadDeviceName(deviceId);
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
    return <Login onLogin={setUser} />;
  }

  return (
    <ErrorBoundary>
      <div className="dashboard">

      <Header deviceName={deviceName} />

      <DeviceSelector
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={handleDeviceChange}
      />

      <div className="grid">

        <div className="card">
          <StatusCard
            refresh={refresh}
            deviceName={deviceName}
            selectedDeviceId={selectedDeviceId}
          />
        </div>

        <div className="card">
          <DeviceConnection
            selectedDeviceId={selectedDeviceId}
            onNameChanged={() => loadDeviceName(selectedDeviceId)}
          />
        </div>

        <div className="card">
          <ManualControl
            onCommandSent={refreshStatus}
            deviceName={deviceName}
            selectedDeviceId={selectedDeviceId}
          />
        </div>

        <div className="card">
          <VoiceControl
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

      </div>
    </ErrorBoundary>
  );
}

export default App;
