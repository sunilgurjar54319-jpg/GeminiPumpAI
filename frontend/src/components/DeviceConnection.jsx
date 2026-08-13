import { useEffect, useState } from "react";

const API = "https://geminipumpai.onrender.com";
const DEVICE_ID = "PUMP001";

function DeviceConnection() {
  const [data, setData] = useState(null);
  const [online, setOnline] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState("");

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

  async function saveDeviceName() {
    const name = newDeviceName.trim();

    if (!name) {
      setNameMessage("Device name खाली नहीं हो सकता");
      return;
    }

    try {
      setSavingName(true);
      setNameMessage("");

      const res = await fetch(
        `${API}/api/device/${DEVICE_ID}/name`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            deviceName: name
          })
        }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Name update failed");
      }

      setData((prev) => ({
        ...prev,
        deviceName: result.deviceName
      }));

      setEditingName(false);
      setNameMessage("Device name updated successfully");

    } catch (err) {
      console.error("Device name update error:", err);
      setNameMessage(err.message);
    } finally {
      setSavingName(false);
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
      <h2>
        📡 {data?.deviceName || "ESP32 Device"}
      </h2>

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

        {!editingName ? (
          <>
            <span>
              {data?.deviceName || DEVICE_ID}
            </span>

            <button
              onClick={() => {
                setNewDeviceName(data?.deviceName || DEVICE_ID);
                setNameMessage("");
                setEditingName(true);
              }}
              style={{
                marginLeft: "10px",
                padding: "5px 10px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                background: "#f5f5f5",
                cursor: "pointer"
              }}
            >
              ✏️ Edit
            </button>
          </>
        ) : (
          <div style={{ marginTop: "8px" }}>
            <input
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              placeholder="Device name"
              style={{
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                width: "200px"
              }}
            />

            <button
              onClick={saveDeviceName}
              disabled={savingName}
              style={{
                marginLeft: "8px",
                padding: "7px 12px",
                border: "none",
                borderRadius: "6px",
                background: "#16a34a",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              {savingName ? "Saving..." : "Save"}
            </button>

            <button
              onClick={() => {
                setEditingName(false);
                setNameMessage("");
              }}
              disabled={savingName}
              style={{
                marginLeft: "6px",
                padding: "7px 12px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                background: "#fff",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>

            {nameMessage && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "13px"
                }}
              >
                {nameMessage}
              </div>
            )}
          </div>
        )}
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
