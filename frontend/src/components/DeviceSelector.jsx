import { useEffect, useState } from "react";
import { authFetch } from "../api";
import { Html5Qrcode } from "html5-qrcode";

function DeviceSelector({ selectedDeviceId, onDeviceChange, refresh }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanner, setScanner] = useState(null);

  async function loadDevices() {
    try {
      setLoading(true);
      setMessage("");

      const res = await authFetch("/api/device/list");
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(
          data.error || data.message || `HTTP ${res.status}`
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

    if (!deviceName) {
      setMessage("⚠️ Device Name डालें");
      return;
    }

    try {
      setAdding(true);
      setMessage("");

      const res = await authFetch("/api/device/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          deviceId,
          deviceName
        })
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(
          data.error ||
          data.message ||
          "Device add failed"
        );
      }

      setNewDeviceId("");
      setNewDeviceName("");
      setShowAddModal(false);

      await loadDevices();

      if (onDeviceChange) {
        onDeviceChange(deviceId);
      }
    } catch (err) {
      console.error("Add device error:", err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setAdding(false);
    }
  }

  async function startScanner() {
    try {
      setMessage("");

      const scannerInstance = new Html5Qrcode("device-id-scanner");

      setScanner(scannerInstance);
      setShowScanner(true);

      await scannerInstance.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async decodedText => {
          const deviceId = String(decodedText || "").trim();

          if (!deviceId) return;

          setNewDeviceId(deviceId);
          setShowScanner(false);

          try {
            await scannerInstance.stop();
          } catch (_) {}

          try {
            await scannerInstance.clear();
          } catch (_) {}

          setScanner(null);
        },
        () => {}
      );
    } catch (err) {
      console.error("Device scanner error:", err);

      setShowScanner(false);
      setScanner(null);

      setMessage(
        "❌ Camera start नहीं हो पाया। Camera permission allow करें।"
      );
    }
  }

  async function stopScanner() {
    if (scanner) {
      try {
        await scanner.stop();
      } catch (_) {}

      try {
        await scanner.clear();
      } catch (_) {}
    }

    setScanner(null);
    setShowScanner(false);
  }

  useEffect(() => {
    loadDevices();
  }, [refresh]);

  return (
    <>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "15px",
          padding: "14px",
          marginTop: "20px",
          background: "#fff"
        }}
      >
        {/* ONE-TAP DEVICE TABS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          {/* SCROLLABLE DEVICE ROW */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              flex: 1,
              paddingBottom: "3px",
              scrollbarWidth: "thin"
            }}
          >
            {loading && devices.length === 0 && (
              <div
                style={{
                  padding: "10px 15px",
                  color: "#666",
                  whiteSpace: "nowrap"
                }}
              >
                Loading devices...
              </div>
            )}

            {devices.map(device => {
              const id =
                device.deviceId || device.$id;

              const name =
                device.deviceName ||
                device.name ||
                id;

              const active =
                id === selectedDeviceId;

              return (
                <button
                  key={id}
                  onClick={() =>
                    onDeviceChange &&
                    onDeviceChange(id)
                  }
                  style={{
                    flexShrink: 0,
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: active
                      ? "1px solid #1976d2"
                      : "1px solid #d0d0d0",
                    background: active
                      ? "#1976d2"
                      : "#f8f9fa",
                    color: active
                      ? "#fff"
                      : "#333",
                    fontSize: "15px",
                    fontWeight: active
                      ? "700"
                      : "500",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease"
                  }}
                >
                  {name}
                </button>
              );
            })}

            {/* ADD DEVICE TAB */}
            <button
              onClick={() => {
                setMessage("");
                setNewDeviceId("");
                setNewDeviceName("");
                setShowAddModal(true);
              }}
              style={{
                flexShrink: 0,
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1px dashed #1976d2",
                background: "#fff",
                color: "#1976d2",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              ＋ Add
            </button>
          </div>

          {/* REFRESH BUTTON */}
          <button
            onClick={loadDevices}
            disabled={loading}
            title="Refresh devices"
            style={{
              flexShrink: 0,
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              border: "1px solid #d0d0d0",
              background: "#fff",
              fontSize: "19px",
              cursor: loading
                ? "default"
                : "pointer"
            }}
          >
            🔄
          </button>
        </div>

        {/* ERROR / STATUS MESSAGE */}
        {message && (
          <div
            style={{
              marginTop: "10px",
              fontWeight: "600",
              fontSize: "14px",
              color: message.startsWith("❌")
                ? "#dc2626"
                : "#444"
            }}
          >
            {message}
          </div>
        )}
      </div>

      {/* ADD DEVICE MODAL */}
      {showAddModal && (
        <div
          onClick={() => {
            if (!adding) {
              setShowAddModal(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#fff",
              borderRadius: "16px",
              padding: "22px",
              boxShadow:
                "0 15px 40px rgba(0,0,0,0.25)"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px"
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "21px"
                }}
              >
                ➕ Add Device
              </h2>

              <button
                onClick={() => {
                  if (!adding) {
                    setShowAddModal(false);
                  }
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666"
                }}
              >
                ×
              </button>
            </div>

            <label
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "6px"
              }}
            >
              Device ID
            </label>

            <input
              value={newDeviceId}
              onChange={e =>
                setNewDeviceId(e.target.value)
              }
              placeholder="Example: PUMP001"
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px",
                borderRadius: "9px",
                border: "1px solid #bbb",
                fontSize: "16px",
                marginBottom: "15px"
              }}
            />

            <button
              type="button"
              onClick={startScanner}
              disabled={adding}
              style={{
                width: "100%",
                padding: "11px",
                borderRadius: "9px",
                border: "1px solid #1976d2",
                background: "#fff",
                color: "#1976d2",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                marginBottom: "18px"
              }}
            >
              📷 Scan Device ID
            </button>

            {showScanner && (
              <div
                style={{
                  marginBottom: "18px",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  background: "#f8f9fa"
                }}
              >
                <div
                  id="device-id-scanner"
                  style={{
                    width: "100%",
                    minHeight: "260px"
                  }}
                />

                <button
                  type="button"
                  onClick={stopScanner}
                  style={{
                    width: "100%",
                    marginTop: "10px",
                    padding: "11px",
                    borderRadius: "9px",
                    border: "1px solid #dc2626",
                    background: "#fff",
                    color: "#dc2626",
                    fontSize: "15px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  ✕ Stop Scanner
                </button>
              </div>
            )}

            <label
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "6px"
              }}
            >
              Device Name
            </label>

            <input
              value={newDeviceName}
              onChange={e =>
                setNewDeviceName(e.target.value)
              }
              placeholder="Example: Switch"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px",
                borderRadius: "9px",
                border: "1px solid #bbb",
                fontSize: "16px",
                marginBottom: "20px"
              }}
            />

            {message && (
              <div
                style={{
                  marginBottom: "14px",
                  color: "#dc2626",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                {message}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px"
              }}
            >
              <button
                onClick={() => {
                  if (!adding) {
                    setShowAddModal(false);
                    setMessage("");
                  }
                }}
                disabled={adding}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "9px",
                  border: "1px solid #bbb",
                  background: "#fff",
                  fontSize: "15px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>

              <button
                onClick={addDevice}
                disabled={adding}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "9px",
                  border: "none",
                  background: "#1976d2",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                {adding
                  ? "Adding..."
                  : "Add Device"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DeviceSelector;
