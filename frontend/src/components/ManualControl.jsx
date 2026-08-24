import { useEffect, useState } from "react";
import { authFetch, getDevice } from "../api";
import VoiceControl from "./VoiceControl";
import Icon from "./Icon";

const ONLINE_TIMEOUT = 60000;

function DeviceStatusIcon({ online }) {
  return (
    <span
      className={`device-status-icon ${
        online ? "device-status-online" : "device-status-offline"
      }`}
      aria-label={online ? "Device connected" : "Device disconnected"}
      title={online ? "Device connected" : "Device disconnected"}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="6" y="3" width="12" height="18" rx="3" />
        <path d="M9 7h6" />
        <path d="M10 17h4" />
      </svg>
    </span>
  );
}

function ManualControl({
  onCommandSent,
  deviceName,
  selectedDeviceId
}) {
  const displayName = deviceName || "Pump";

  const [isOn, setIsOn] = useState(false);
  const [deviceOnline, setDeviceOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [deletingDevice, setDeletingDevice] = useState(false);

  async function saveDeviceName() {
    const name = newDeviceName.trim();

    if (!name) {
      setNameMessage("Device name खाली नहीं हो सकता");
      return;
    }

    try {
      setSavingName(true);
      setNameMessage("");

      const res = await authFetch(
        `/api/device/${selectedDeviceId}/name`,
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
        throw new Error(
          result.error || "Name update failed"
        );
      }

      setEditingName(false);
      setNameMessage("Device name updated successfully");

      if (onCommandSent) {
        onCommandSent();
      }
    } catch (err) {
      console.error("Device name update error:", err);
      setNameMessage(err.message);
    } finally {
      setSavingName(false);
    }
  }


  async function deleteSelectedDevice() {
    if (!selectedDeviceId || deletingDevice || savingName) {
      return;
    }

    const confirmed = window.confirm(
      `Delete device "${displayName}" (${selectedDeviceId})?\n\nOnly this selected device will be deleted.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingDevice(true);
      setNameMessage("");

      const res = await authFetch(
        `/api/device/${encodeURIComponent(selectedDeviceId)}`,
        {
          method: "DELETE"
        }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(
          result.error || "Device delete failed"
        );
      }

      setShowSettings(false);
      setEditingName(false);
      setNameMessage("");

      if (onCommandSent) {
        onCommandSent();
      }

    } catch (err) {

      console.error(
        "Device delete error:",
        err
      );

      setNameMessage(
        err.message || "Device delete failed"
      );

    } finally {
      setDeletingDevice(false);
    }
  }


  // =========================================
  // Check ESP32 connection
  // =========================================

  useEffect(() => {
    setIsOn(false);
    setDeviceOnline(false);
    setLoading(false);
    setMessage("");
  }, [selectedDeviceId]);

  async function loadDeviceStatus() {
    try {
      const data = await getDevice(selectedDeviceId);

      console.log(
        "MANUAL CONTROL DEVICE API:",
        data
      );

      if (!data || data.success === false) {
        throw new Error(
          data?.message || "Device API failed"
        );
      }

      if (!data.lastSeen) {
        setDeviceOnline(false);

        setMessage(
          "RMU FW Update available or Pump is not connected to network"
        );

        return;
      }

      const lastSeenTime =
        new Date(data.lastSeen).getTime();

      const age =
        Date.now() - lastSeenTime;

      const wifiConnected =
        String(
          data.wifiStatus || ""
        ).toUpperCase() === "CONNECTED";

      const online =
        wifiConnected &&
        age >= 0 &&
        age <= ONLINE_TIMEOUT;

      console.log(
        "MANUAL CONTROL ONLINE CHECK:",
        {
          lastSeen: data.lastSeen,
          age: age,
          wifiStatus: data.wifiStatus,
          wifiConnected: wifiConnected,
          online: online
        }
      );

      setDeviceOnline(online);

      if (online) {
        setMessage("");
      } else {
        setMessage(
          "RMU FW Update available or Pump is not connected to network"
        );
      }
    } catch (err) {
      console.error(
        "Manual Control Device Error:",
        err
      );

      setDeviceOnline(false);

      setMessage(
        "RMU FW Update available or Pump is not connected to network"
      );
    }
  }

  // =========================================
  // Current pump status
  // ONLY when device is online
  // =========================================

  async function loadPumpStatus() {
    if (!deviceOnline) {
      return;
    }

    try {
      const res = await authFetch(
        `/api/status/${selectedDeviceId}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (data.status === "ON") {
        setIsOn(true);
      }

      if (data.status === "OFF") {
        setIsOn(false);
      }
    } catch (err) {
      console.log(
        "Pump status error:",
        err
      );
    }
  }

  // =========================================
  // Device heartbeat/status polling
  // =========================================

  useEffect(() => {
    if (!selectedDeviceId) {
      setDeviceOnline(false);
      return;
    }

    loadDeviceStatus();

    const timer = setInterval(
      loadDeviceStatus,
      5000
    );

    return () => clearInterval(timer);
  }, [selectedDeviceId]);

  // =========================================
  // Pump status polling
  // =========================================

  useEffect(() => {
    if (deviceOnline) {
      loadPumpStatus();
    }

    const timer = setInterval(() => {
      if (deviceOnline) {
        loadPumpStatus();
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [deviceOnline]);

  // =========================================
  // Send Manual Command
  // =========================================

  async function sendCommand(command) {
    if (!deviceOnline) {
      setMessage(
        "RMU FW Update available or Pump is not connected to network"
      );

      return;
    }

    if (loading) return;

    setLoading(true);

    setMessage(
      command === "ON"
        ? `${displayName} Starting...`
        : `${displayName} Stopping...`
    );

    try {
      const res = await authFetch(
        "/api/command/send",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            deviceId: selectedDeviceId,
            command
          })
        }
      );

      const data = await res.json();

      console.log("MANUAL COMMAND RESPONSE:", {
        status: res.status,
        ok: res.ok,
        data
      });

      // Show backend authentication/owner errors clearly
      if (!res.ok) {
        setMessage(
          data?.error
            ? `Command failed (${res.status}): ${data.error}`
            : `Command failed (${res.status})`
        );
        setLoading(false);
        return;
      }

      // Already same state
      if (data.ignored) {
        setIsOn(data.status === "ON");

        setMessage(
          data.status === "ON"
            ? `${displayName} is already ON`
            : `${displayName} is already OFF`
        );

        setLoading(false);

        return;
      }

      // Command successfully created
      if (data.$id) {
        setIsOn(command === "ON");

        setMessage(
          command === "ON"
            ? `${displayName} ON Command Sent`
            : `${displayName} OFF Command Sent`
        );

        if (onCommandSent) {
          setTimeout(() => {
            onCommandSent();
          }, 3000);
        }
      } else {
        setMessage(
          "Command Failed"
        );
      }
    } catch (err) {
      console.log(
        "Command error:",
        err
      );

      setMessage(
        "Server Error"
      );
    }

    setLoading(false);
  }

  // =========================================
  // Manual Toggle
  // =========================================

  function togglePump() {
    if (!deviceOnline) {
      setMessage(
        "RMU FW Update available or Pump is not connected to network"
      );

      return;
    }

    const nextCommand =
      isOn ? "OFF" : "ON";

    sendCommand(nextCommand);
  }

  return (
    <>
      <div className="manual-control-card">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="manual-control-header">

        <div className="manual-control-title">
          <div className="manual-control-title-main">
            Control
          </div>

          <div className="manual-control-device-name">
            {displayName}
          </div>
        </div>

        <div className="manual-control-header-actions">
          <DeviceStatusIcon
            online={deviceOnline}
          />

          <button
            type="button"
            className="device-settings-button"
            onClick={() => {
              setNewDeviceName(displayName);
              setNameMessage("");
              setEditingName(false);
              setShowSettings(true);
            }}
            aria-label="Device settings"
            title="Device settings"
          >
            <Icon name="settings" size={20} />
          </button>
        </div>

      </div>


      {/* =====================================
          BODY
      ===================================== */}

      <div className="manual-control-body">

        {/* =====================================
            OFFLINE MESSAGE
        ===================================== */}

        {!deviceOnline && (
          <div className="manual-control-notice">
            RMU FW Update available or Pump is not connected to network
          </div>
        )}


        {/* =====================================
            INNER CONTROL BOX
        ===================================== */}

        <div className="manual-control-box">

          <div className="manual-control-box-left">

            <div className="manual-control-box-title">
              Mobile ON/OFF Control
            </div>

          </div>


          <div className="manual-control-toggle-area">

            <button
              type="button"
              onClick={togglePump}
              disabled={
                loading ||
                !deviceOnline
              }
              aria-label={
                !deviceOnline
                  ? `${displayName} disconnected`
                  : isOn
                    ? `Turn ${displayName} OFF`
                    : `Turn ${displayName} ON`
              }
              className={`manual-toggle ${
                isOn
                  ? "manual-toggle-on"
                  : "manual-toggle-off"
              } ${
                !deviceOnline
                  ? "manual-toggle-disabled"
                  : ""
              } ${
                loading
                  ? "manual-toggle-loading"
                  : ""
              }`}
            >
              <span
                className={`manual-toggle-knob ${
                  isOn
                    ? "manual-toggle-knob-on"
                    : ""
                }`}
              />
            </button>

            <div className="manual-toggle-labels">
              <span
                className={
                  !isOn
                    ? "toggle-label-active"
                    : ""
                }
              >
                OFF
              </span>

              <span
                className={
                  isOn
                    ? "toggle-label-active"
                    : ""
                }
              >
                ON
              </span>
            </div>

          </div>

        </div>


                <div className="manual-voice-control">
          <VoiceControl
            onCommandSent={onCommandSent}
            deviceName={deviceName}
            selectedDeviceId={selectedDeviceId}
          />
        </div>

{/* =====================================
            COMMAND MESSAGE
        ===================================== */}

        {deviceOnline && message && (
          <div
            className={`manual-command-message ${
              message.includes("Failed") ||
              message.includes("Error")
                ? "manual-command-error"
                : "manual-command-success"
            }`}
          >
            {message}
          </div>
        )}

      </div>

    </div>

      {showSettings && (
              <div
                className="device-settings-overlay"
                onClick={() => {
                  if (!savingName && !deletingDevice) {
                    setShowSettings(false);
                    setEditingName(false);
                    setNameMessage("");
                  }
                }}
              >
                <div
                  className="device-settings-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="device-settings-header">
                    <strong>Device Settings</strong>

                    <button
                      type="button"
                      className="device-settings-close"
                      onClick={() => {
                        if (!savingName && !deletingDevice) {
                          setShowSettings(false);
                          setEditingName(false);
                          setNameMessage("");
                        }
                      }}
                      disabled={savingName || deletingDevice}
                      aria-label="Close settings"
                    >
                      ×
                    </button>
                  </div>

                  <div className="device-settings-row">
                    <span>Device ID</span>
                    <strong>{selectedDeviceId}</strong>
                  </div>

                  <div className="device-settings-row device-settings-name">
                    <span>Device Name</span>

                    {!editingName ? (
                      <div className="device-settings-name-value">
                        <strong>{displayName}</strong>

                        <button
                          type="button"
                          className="device-settings-edit"
                          onClick={() => {
                            setNewDeviceName(displayName);
                            setNameMessage("");
                            setEditingName(true);
                          }}
                        >
                          <Icon name="edit" size={16} />
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div className="device-settings-edit-area">
                        <input
                          value={newDeviceName}
                          onChange={(e) =>
                            setNewDeviceName(e.target.value)
                          }
                          placeholder="Device name"
                          autoFocus
                        />

                        <div className="device-settings-edit-buttons">
                          <button
                            type="button"
                            className="device-settings-save"
                            onClick={saveDeviceName}
                            disabled={savingName}
                          >
                            {savingName ? "Saving..." : "Save"}
                          </button>

                          <button
                            type="button"
                            className="device-settings-cancel"
                            onClick={() => {
                              setEditingName(false);
                              setNameMessage("");
                            }}
                            disabled={savingName}
                          >
                            Cancel
                          </button>
                        </div>

                        {nameMessage && (
                          <div className="device-settings-message">
                            {nameMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    className="device-settings-row"
                    style={{
                      marginTop: "18px",
                      paddingTop: "16px",
                      borderTop: "1px solid #eee"
                    }}
                  >
                    <button
                      type="button"
                      onClick={deleteSelectedDevice}
                      disabled={deletingDevice || savingName}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: "9px",
                        border: "1px solid #dc3545",
                        background: "#fff",
                        color: "#dc3545",
                        fontSize: "14px",
                        fontWeight: "700",
                        cursor:
                          deletingDevice || savingName
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          deletingDevice || savingName
                            ? 0.6
                            : 1
                      }}
                    >
                      {deletingDevice
                        ? "Deleting..."
                        : "Delete Selected Device"}
                    </button>
                  </div>
                </div>
              </div>
            )}
    </>
  );
}

export default ManualControl;
