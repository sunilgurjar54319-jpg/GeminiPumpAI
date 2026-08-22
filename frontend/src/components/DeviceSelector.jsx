import { useEffect, useState } from "react";
import { authFetch } from "../api";

function DeviceSelector({ selectedDeviceId, onDeviceChange }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [message, setMessage] = useState("");

  async function loadDevices() {
    try {
      setLoading(true);
      setMessage("");

      const res = await authFetch("/api/device/list");

      const data = await res.json();
      console.log("DEVICE LIST RESPONSE:", data);
      setMessage("DEBUG: " + JSON.stringify(data));

      if (!res.ok || data.success === false) {
        throw new Error(
          data.error || `HTTP ${res.status}`
        );
      }

      const list = Array.isArray(data.devices)
        ? data.devices
        : [];

      setDevices(list);

      if (list.length > 0) {
        const currentExists = list.some(
          d => (d.deviceId || d.$id) === selectedDeviceId
        );

        if (!currentExists && onDeviceChange) {
          onDeviceChange(
            list[0].deviceId || list[0].$id
          );
        }
      }
    } catch (err) {
      console.error("Device list error:", err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function addDevice() {
    const deviceId = newDeviceId.trim();
    const deviceName = newDeviceName.trim();

    if (!deviceId) {
      setMessage("⚠️ Device ID डालें");
      return;
    }

    try {
      setMessage("⏳ Device add हो रहा है...");

      const res = await authFetch("/api/device/register", {
        method: "POST",
        body: JSON.stringify({
          deviceId,
          deviceName: deviceName || deviceId
        })
      });

      const data = await res.json();
      console.log("DEVICE LIST RESPONSE:", data);
      setMessage("DEBUG: " + JSON.stringify(data));

      if (!res.ok || data.success === false) {
        throw new Error(
          data.error ||
          data.message ||
          "Device add failed"
        );
      }

      setNewDeviceId("");
      setNewDeviceName("");
      setMessage("✅ Device added successfully");

      await loadDevices();

      if (onDeviceChange) {
        onDeviceChange(deviceId);
      }
    } catch (err) {
      console.error("Add device error:", err);
      setMessage(`❌ ${err.message}`);
    }
  }

  useEffect(() => {
    loadDevices();
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
      <h2>📱 Device Selection</h2>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "center"
        }}
      >
        <select
          value={selectedDeviceId || ""}
          onChange={e =>
            onDeviceChange &&
            onDeviceChange(e.target.value)
          }
          disabled={loading}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #aaa",
            minWidth: "200px",
            fontSize: "16px"
          }}
        >
          <option value="">
            {loading
              ? "Loading devices..."
              : "Select Device"}
          </option>

          {devices.map(device => {
            const id =
              device.deviceId || device.$id;

            const name =
              device.deviceName ||
              device.name ||
              id;

            return (
              <option key={id} value={id}>
                {name} ({id})
              </option>
            );
          })}
        </select>

        <input
          value={newDeviceId}
          onChange={e =>
            setNewDeviceId(e.target.value)
          }
          placeholder="Device ID"
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #aaa",
            fontSize: "16px"
          }}
        />

        <input
          value={newDeviceName}
          onChange={e =>
            setNewDeviceName(e.target.value)
          }
          placeholder="Device Name"
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #aaa",
            fontSize: "16px"
          }}
        />

        <button
          onClick={addDevice}
          disabled={loading}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            background: "#1976d2",
            color: "white",
            fontSize: "15px",
            cursor: "pointer"
          }}
        >
          ➕ Add Device
        </button>

        <button
          onClick={loadDevices}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid #aaa",
            background: "white",
            fontSize: "15px"
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {selectedDeviceId && (
        <p style={{ marginBottom: 0 }}>
          <b>Selected Device:</b>{" "}
          {selectedDeviceId}
        </p>
      )}

      {message && (
        <p
          style={{
            fontWeight: "bold",
            marginBottom: 0
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export default DeviceSelector;
