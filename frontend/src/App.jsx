import { useEffect, useState } from "react";

import Header from "./components/Header";
import StatusCard from "./components/StatusCard";
import ManualControl from "./components/ManualControl";
import VoiceControl from "./components/VoiceControl";
import Schedule from "./components/Schedule";
import HistoryCard from "./components/HistoryCard";
import StatsCard from "./components/StatsCard";
import DeviceConnection from "./components/DeviceConnection";
import "./App.css";

const API = "https://geminipumpai.onrender.com";
const DEVICE_ID = "PUMP001";

function App() {

  const [refresh, setRefresh] = useState(false);
  const [deviceName, setDeviceName] = useState(DEVICE_ID);

  async function loadDeviceName() {
    try {
      const res = await fetch(
        `${API}/api/device/${DEVICE_ID}?t=${Date.now()}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        throw new Error("Device API error");
      }

      const data = await res.json();

      if (data.deviceName) {
        setDeviceName(data.deviceName);
      }

    } catch (err) {
      console.error("Device name error:", err);
    }
  }

  function refreshStatus() {
    setRefresh(prev => !prev);
    loadDeviceName();
  }

  useEffect(() => {

    loadDeviceName();

    const timer = setInterval(
      loadDeviceName,
      5000
    );

    return () => clearInterval(timer);

  }, []);

  return (

    <div className="dashboard">

      <Header deviceName={deviceName} />

      <div className="grid">

        <div className="card">
          <StatusCard
            refresh={refresh}
            deviceName={deviceName}
          />
        </div>

        <div className="card">
          <DeviceConnection
            onNameChanged={loadDeviceName}
          />
        </div>

        <div className="card">
          <ManualControl
            onCommandSent={refreshStatus}
            deviceName={deviceName}
          />
        </div>

        <div className="card">
          <VoiceControl
            onCommandSent={refreshStatus}
            deviceName={deviceName}
          />
        </div>

        <div className="card">
          <StatsCard
            refresh={refresh}
            deviceName={deviceName}
          />
        </div>

        <div className="card">
          <Schedule
            refresh={refresh}
            deviceName={deviceName}
          />
        </div>

        <div className="card full">
          <HistoryCard
            deviceName={deviceName}
          />
        </div>

      </div>

    </div>
  );
}

export default App;
