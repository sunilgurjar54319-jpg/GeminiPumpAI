import { useEffect, useState } from "react";
import { authFetch } from "../api";
import { Html5Qrcode } from "html5-qrcode";
import Icon from "./Icon";

const deviceGlassStyle = `
@keyframes devicePremiumSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes deviceGlassFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes deviceGlassModalIn {
  from {
    opacity: 0;
    transform: translate3d(0, 8px, 0) scale(0.985);
  }
  60% {
    opacity: 1;
    transform: translate3d(0, 1px, 0) scale(0.998);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
`;


function DeviceSelector({
  selectedDeviceId,
  onDeviceChange,
  refresh,
  onDevicesLoaded
}) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [closingAddModal, setClosingAddModal] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanner, setScanner] = useState(null);

  function closeAddModal() {
    if (adding || closingAddModal) return;

    setClosingAddModal(true);

    window.setTimeout(() => {
      setShowAddModal(false);
      setClosingAddModal(false);
    }, 320);
  }

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

      if (onDevicesLoaded) {
        onDevicesLoaded(list);
      }

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
      <style>{deviceGlassStyle}</style>
      <div
        className="device-selector-liquid"
        style={{
          border: "1px solid rgba(255,255,255,0.72)",
          borderRadius: "22px",
          padding: "14px",
          marginTop: "20px",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.72), rgba(255,255,255,0.38))",
          boxShadow:
            "0 8px 32px rgba(31,38,135,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
          backdropFilter: "blur(22px) saturate(180%)",
          WebkitBackdropFilter: "blur(22px) saturate(180%)"
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
            className="device-tabs-scroll"
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
                aria-label="Loading devices"
                style={{
                  width: "120px",
                  height: "42px",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.55)",
                  border: "1px solid rgba(255,255,255,0.75)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 14px rgba(31,38,135,0.06)",
                  boxSizing: "border-box"
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    border: "3px solid rgba(25,118,210,0.16)",
                    borderTopColor: "#1976d2",
                    borderRightColor: "#2456A6",
                    animation: "devicePremiumSpin 0.9s linear infinite",
                    boxSizing: "border-box"
                  }}
                />
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
          className={`premium-button-press device-tab-3d ${active ? "device-tab-active" : "device-tab-inactive"}`}
                  key={id}
                  onClick={() =>
                    onDeviceChange &&
                    onDeviceChange(id)
                  }
                  style={{
                    flexShrink: 0,
                    padding: "11px 18px",
                    borderRadius: "16px",
                    border: active
                      ? "1px solid rgba(255,255,255,0.92)"
                      : "1px solid rgba(255,255,255,0.62)",
                    background: active
                      ? "linear-gradient(145deg, #163A70, #2456A6)"
                      : "rgba(255,255,255,0.46)",
                    color: active ? "#ffffff" : "#374151",
                    fontSize: "15px",
                    fontWeight: active ? "700" : "500",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: active
                      ? "0 8px 24px rgba(15,45,110,0.28), inset 0 1px 0 rgba(255,255,255,0.32)"
                      : "0 3px 12px rgba(31,38,135,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
                    backdropFilter: "blur(18px) saturate(180%)",
                    WebkitBackdropFilter: "blur(18px) saturate(180%)",
                    transition: "all 0.22s ease"
                  }}
                >
                  {name}
                </button>
              );
            })}

            {/* ADD DEVICE TAB */}
            <button
          className="premium-button-press device-add-3d"
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
          className="premium-button-press device-refresh-3d"
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
          className={closingAddModal ? "device-add-overlay-closing" : ""}
          onClick={() => {
            closeAddModal();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.30)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
            backdropFilter: "blur(8px) saturate(120%)",
            WebkitBackdropFilter: "blur(8px) saturate(120%)",
            animation: "none",
            willChange: "auto",
            transform: "translateZ(0)"
          }}
        >
          <div
            className={closingAddModal ? "device-add-modal-closing" : ""}
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "420px",
              boxSizing: "border-box",
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.82), rgba(235,242,255,0.62))",
              border: "1px solid rgba(255,255,255,0.78)",
              borderRadius: "28px",
              padding: "24px",
              boxShadow:
                "0 24px 70px rgba(15,23,42,0.24), inset 0 1px 0 rgba(255,255,255,0.95)",
              backdropFilter: "blur(24px) saturate(170%)",
              WebkitBackdropFilter: "blur(24px) saturate(170%)",
              animation: "deviceGlassModalIn 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) both",
              willChange: "transform, opacity",
              transform: "translate3d(0, 0, 0)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "22px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "11px"
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.58)",
                    border: "1px solid rgba(255,255,255,0.72)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)"
                  }}
                >
                  <Icon name="add" size={21} strokeWidth={2.2} />
                </div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "21px",
                    fontWeight: "700",
                    letterSpacing: "-0.02em",
                    color: "#111827"
                  }}
                >
                  Add Device
                </h2>
              </div>

              <button
          className="premium-button-press"
                onClick={() => {
                  closeAddModal();
                }}
                aria-label="Close"
                style={{
                  width: "38px",
                  height: "38px",
                  padding: 0,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.72)",
                  background: "rgba(255,255,255,0.58)",
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: adding ? "default" : "pointer",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                  transition: "transform 0.18s ease, background 0.18s ease"
                }}
              >
                <Icon name="close" size={18} strokeWidth={2.2} />
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
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px 16px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.78)",
                background: "rgba(255,255,255,0.58)",
                color: "#111827",
                fontSize: "16px",
                fontWeight: "500",
                outline: "none",
                marginBottom: "15px",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 18px rgba(15,23,42,0.06)",
                backdropFilter: "blur(18px) saturate(150%)",
                WebkitBackdropFilter: "blur(18px) saturate(150%)",
                transition: "box-shadow 0.2s ease, transform 0.2s ease"
              }}
            />

            <button
          className="premium-button-press"
              type="button"
              onClick={startScanner}
              disabled={adding}
              style={{
                width: "100%",
                minHeight: "50px",
                padding: "12px 16px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.78)",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(225,235,255,0.52))",
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "9px",
                fontSize: "15px",
                fontWeight: "650",
                cursor: adding ? "default" : "pointer",
                marginBottom: "18px",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.95), 0 6px 20px rgba(37,99,235,0.08)",
                backdropFilter: "blur(18px) saturate(160%)",
                WebkitBackdropFilter: "blur(18px) saturate(160%)",
                transition: "transform 0.18s ease, box-shadow 0.18s ease"
              }}
            >
              <Icon name="camera" size={20} strokeWidth={2.1} />
              <span>Scan Device ID</span>
            </button>

            {showScanner && (
              <div
                style={{
                  marginBottom: "18px",
                  padding: "12px",
                  border: "1px solid rgba(255,255,255,0.78)",
                  borderRadius: "20px",
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,0.58), rgba(225,235,255,0.38))",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 30px rgba(15,23,42,0.08)",
                  backdropFilter: "blur(24px) saturate(160%)",
                  WebkitBackdropFilter: "blur(24px) saturate(160%)",
                  animation: "deviceGlassScannerIn 0.28s ease-out"
                }}
              >
                <div
                  id="device-id-scanner"
                  style={{
                    width: "100%",
                    minHeight: "260px",
                    overflow: "hidden",
                    borderRadius: "16px"
                  }}
                />

                <button
          className="premium-button-press"
                  type="button"
                  onClick={stopScanner}
                  style={{
                    width: "100%",
                    minHeight: "48px",
                    marginTop: "10px",
                    padding: "11px 16px",
                    borderRadius: "15px",
                    border: "1px solid rgba(255,255,255,0.72)",
                    background:
                      "rgba(255,255,255,0.58)",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    fontSize: "15px",
                    fontWeight: "650",
                    cursor: "pointer",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.9), 0 5px 16px rgba(15,23,42,0.06)",
                    backdropFilter: "blur(18px) saturate(150%)",
                    WebkitBackdropFilter: "blur(18px) saturate(150%)",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease"
                  }}
                >
                  <Icon name="close" size={18} strokeWidth={2.2} />
                  <span>Stop Scanner</span>
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
                padding: "14px 16px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.78)",
                background: "rgba(255,255,255,0.58)",
                color: "#111827",
                fontSize: "16px",
                fontWeight: "500",
                outline: "none",
                marginBottom: "20px",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 18px rgba(15,23,42,0.06)",
                backdropFilter: "blur(18px) saturate(150%)",
                WebkitBackdropFilter: "blur(18px) saturate(150%)",
                transition: "box-shadow 0.2s ease, transform 0.2s ease"
              }}
            />

            {message && (
              <div
                style={{
                  marginBottom: "14px",
                  padding: "11px 14px",
                  borderRadius: "14px",
                  border: "1px solid rgba(220,38,38,0.16)",
                  background: "rgba(255,245,245,0.68)",
                  color: "#dc2626",
                  fontWeight: "600",
                  fontSize: "14px",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)"
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
          className="premium-button-press"
                onClick={() => {
                  if (!adding) {
                    setMessage("");
                    closeAddModal();
                  }
                }}
                disabled={adding}
                style={{
                  flex: 1,
                  padding: "13px 16px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.78)",
                  background: "rgba(255,255,255,0.58)",
                  color: "#374151",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: adding ? "default" : "pointer",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.95), 0 6px 20px rgba(15,23,42,0.06)",
                  backdropFilter: "blur(18px) saturate(160%)",
                  WebkitBackdropFilter: "blur(18px) saturate(160%)",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease"
                }}
              >
                Cancel
              </button>

              <button
          className="premium-button-press"
                onClick={addDevice}
                disabled={adding}
                style={{
                  flex: 1,
                  padding: "13px 16px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.30)",
                  background:
                    "linear-gradient(135deg, #0B2A5B 0%, #123F7A 100%)",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: adding ? "default" : "pointer",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px rgba(37,99,235,0.24)",
                  backdropFilter: "blur(18px) saturate(160%)",
                  WebkitBackdropFilter: "blur(18px) saturate(160%)",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease"
                }}
              >
                {adding ? "Adding..." : "Add Device"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DeviceSelector;
