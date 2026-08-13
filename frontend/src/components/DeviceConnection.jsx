import { useEffect, useState } from "react";

const API = "https://geminipumpai.onrender.com";
const DEVICE_ID = "PUMP001";

function DeviceConnection() {
  const [data, setData] = useState(null);
  const [online, setOnline] = useState(false);

  async function fetchDeviceStatus() {
    try {
      const res = await fetch(
        `${API}/api/device/${DEVICE_ID}`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error("API error");

      const result = await res.json();

      setData(result);

      if (result.lastSeen) {
        const lastSeen = new Date(result.lastSeen).getTime();
        const now = Date.now();

        // 30 seconds ke andar heartbeat = ONLINE
        setOnline(now - lastSeen <= 30000);
      } else {
        setOnline(false);
      }

    } catch (err) {
      console.error("Device status error:", err);
      setOnline(false);
    }
  }

  useEffect(() => {
    fetchDeviceStatus();

    const timer = setInterval(
      fetchDeviceStatus,
      5000
    );

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "15px",
        padding: "20px",
        marginTop: "20px",
        background: "#fff"
      }}
    >
      <h2>📡 ESP32 Device</h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "18px",
          fontWeight: "bold"
        }}
      >
        <span
          style={{
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            background: online ? "#16a34a" : "#dc2626",
            display: "inline-block"
          }}
        />

        {online
          ? "🟢 ESP32 Online"
          : "🔴 ESP32 Offline"}
      </div>

      <div style={{ marginTop: "12px" }}>
        <b>📶 Wi-Fi:</b>{" "}
        {data?.wifiStatus || "UNKNOWN"}
      </div>

      <div style={{ marginTop: "8px" }}>
        <b>📛 Device Name:</b>{" "}
        {data?.deviceName || DEVICE_ID}

      </div>

      <div style={{ marginTop: "8px" }}>
        <b>🆔 Device ID:</b> {DEVICE_ID}
      </div>

      <div style={{ marginTop: "8px" }}>
        <b>🕐 Last Seen:</b>{" "}
        {data?.lastSeen
          ? new Date(data.lastSeen).toLocaleString("en-IN")
          : "Never"}
      </div>

      <div
        style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid #eee"
        }}
      >
        <b>📡 Sensors</b>

        <div style={{ marginTop: "10px" }}>
          💧 Water Level: <b>
            {data?.sensors?.float
              ? "Sensor Connected"
              : "No Sensor"}
          </b>
        </div>

        <div style={{ marginTop: "8px" }}>
          ⚡ Voltage: <b>
            {data?.sensors?.voltage
              ? "Sensor Connected"
              : "No Sensor"}
          </b>
        </div>

        <div style={{ marginTop: "8px" }}>
          🔌 Current: <b>
            {data?.sensors?.current
              ? "Sensor Connected"
              : "No Sensor"}
          </b>
        </div>

        <div style={{ marginTop: "8px" }}>
          🌊 Float: <b>
            {data?.sensors?.float
              ? "Sensor Connected"
              : "No Sensor"}
          </b>
        </div>

        <div style={{ marginTop: "8px" }}>
          💨 Pressure: <b>
            {data?.sensors?.pressure
              ? "Sensor Connected"
              : "No Sensor"}
          </b>
        </div>
      </div>
    </div>
  );
}

export default DeviceConnection;
