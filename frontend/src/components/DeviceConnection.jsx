import { useEffect, useState } from "react";

import { authFetch, deviceFetch } from "../api";
import Icon from "./Icon";

function DeviceConnection({ onNameChanged, selectedDeviceId }) {
  const [data, setData] = useState(null);
  const [pumpStatus, setPumpStatus] = useState("UNKNOWN");

  const [online, setOnline] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // =========================================
  // DEVICE + SENSOR STATUS
  // =========================================

  async function fetchDeviceStatus() {
    try {
      const res = await deviceFetch(
        `/api/device/${selectedDeviceId}`,
        {
          cache: "no-store"
        }
      );

      if (!res.ok) {
        throw new Error("Device API error");
      }

      const result = await res.json();

      setData(result);

      // -----------------------------
      // ONLINE / OFFLINE
      // -----------------------------

      if (result.lastSeen) {
        const lastSeen =
          new Date(result.lastSeen).getTime();

        const now = Date.now();

        setOnline(
          now - lastSeen <= 60000
        );
      } else {
        setOnline(false);
      }

    } catch (err) {

      console.error(
        "Device status error:",
        err
      );

      setOnline(false);
    }
  }


  // =========================================
  // PUMP REAL STATUS
  // =========================================

  async function fetchPumpStatus() {

    try {

      const res = await deviceFetch(
        `/api/status/${selectedDeviceId}`,
        {
          cache: "no-store"
        }
      );

      if (!res.ok) {
        throw new Error("Status API error");
      }

      const result = await res.json();

      const status =
        String(
          result?.status || "UNKNOWN"
        ).toUpperCase();

      if (
        status === "ON" ||
        status === "OFF"
      ) {
        setPumpStatus(status);
      } else {
        setPumpStatus("UNKNOWN");
      }

    } catch (err) {

      console.error(
        "Pump status error:",
        err
      );

      setPumpStatus("UNKNOWN");
    }
  }


  // =========================================
  // DEVICE NAME
  // =========================================

  async function saveDeviceName() {

    const name =
      newDeviceName.trim();

    if (!name) {

      setNameMessage(
        "Device name खाली नहीं हो सकता"
      );

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
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            deviceName: name
          })
        }
      );

      const result =
        await res.json();

      if (
        !res.ok ||
        !result.success
      ) {

        throw new Error(
          result.error ||
          "Name update failed"
        );
      }

      setData((prev) => ({
        ...prev,
        deviceName:
          result.deviceName
      }));

      // App.jsx को नया device name तुरंत दें
      // ताकि dashboard के सभी components में नया नाम दिखे।
      if (onNameChanged) {
        onNameChanged(result.deviceName);
      }

      setEditingName(false);

      setNameMessage(
        "Device name updated successfully"
      );

    } catch (err) {

      console.error(
        "Device name update error:",
        err
      );

      setNameMessage(
        err.message
      );

    } finally {

      setSavingName(false);
    }
  }


  // =========================================
  // AUTO REFRESH
  // =========================================

  useEffect(() => {

    // Device बदलते ही पुराने device का data हटाएँ
    setData(null);
    setPumpStatus("UNKNOWN");
    setOnline(false);
    setNameMessage("");

    // Device open/change होने पर एक बार status read करें.
    // Continuous 5-second polling नहीं — Appwrite reads कम रखने के लिए.
    fetchDeviceStatus();
    fetchPumpStatus();

  }, [selectedDeviceId]);


  // =========================================
  // SENSOR CAPABILITIES
  // =========================================

  const sensors =
    data?.sensors || {};

  const hasVoltage =
    sensors.voltage === true;

  const hasCurrent =
    sensors.current === true;

  const hasFloat =
    sensors.float === true;

  const hasPressure =
    sensors.pressure === true;

  const hasTemperature =
    sensors.temperature === true;


  return (
    <div className="device-control-card">

      {/* CONNECTION HEADER */}
      <div className="device-control-header">

        <div className="device-control-title">
          Device Connection
        </div>

        <div className="device-control-actions">

          <span
            className={`device-online-logo ${
              online
                ? "device-online-logo-online"
                : "device-online-logo-offline"
            }`}
            title={
              online
                ? "Device connected"
                : "Device disconnected"
            }
            aria-label={
              online
                ? "Device connected"
                : "Device disconnected"
            }
          />

          <button
            type="button"
            className="device-settings-button premium-button-press"
            onClick={() => setShowSettings(true)}
            aria-label="Device settings"
            title="Device settings"
          >
            ⚙
          </button>

        </div>
      </div>


      {/* OFFLINE INFORMATION */}
      {!online && (
        <div className="device-offline-info">
          Device is offline
          {data?.lastSeen && (
            <span>
              {" "}· Last Seen:{" "}
              {new Date(data.lastSeen).toLocaleString("en-IN")}
            </span>
          )}
        </div>
      )}


      {/* SENSOR STATUS
          Show something ONLY when a sensor exists.
          No-sensor message is intentionally removed. */}
      {(hasVoltage ||
        hasCurrent ||
        hasFloat ||
        hasPressure ||
        hasTemperature) && (

        <div className="device-sensor-strip">

          {hasVoltage && (
            <div className="device-sensor-item">
              <span>Voltage</span>
              <strong>
                {data?.voltage !== undefined
                  ? `${data.voltage} V`
                  : "Connected"}
              </strong>
            </div>
          )}

          {hasCurrent && (
            <div className="device-sensor-item">
              <span>Current</span>
              <strong>
                {data?.current !== undefined
                  ? `${data.current} A`
                  : "Connected"}
              </strong>
            </div>
          )}

          {hasFloat && (
            <div className="device-sensor-item">
              <span>Water Level</span>
              <strong>
                {data?.waterLevel !== undefined
                  ? data.waterLevel
                  : "Connected"}
              </strong>
            </div>
          )}

          {hasPressure && (
            <div className="device-sensor-item">
              <span>Pressure</span>
              <strong>
                {data?.pressure !== undefined
                  ? `${data.pressure} PSI`
                  : "Connected"}
              </strong>
            </div>
          )}

          {hasTemperature && (
            <div className="device-sensor-item">
              <span>Temperature</span>
              <strong>
                {data?.temperature !== undefined
                  ? `${data.temperature} °C`
                  : "Connected"}
              </strong>
            </div>
          )}

        </div>
      )}


      {/* SETTINGS POPUP */}
      {showSettings && (
        <div
          className="device-settings-overlay"
          onClick={() => {
            if (!savingName) {
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
                className="device-settings-close premium-button-press"
                onClick={() => {
                  if (!savingName) {
                    setShowSettings(false);
                    setEditingName(false);
                    setNameMessage("");
                  }
                }}
                disabled={savingName}
                aria-label="Close settings"
              >
                ×
              </button>
            </div>


            {/* DEVICE ID */}
            <div className="device-settings-row">
              <span>Device ID</span>
              <strong>{selectedDeviceId}</strong>
            </div>


            {/* DEVICE NAME */}
            <div className="device-settings-row device-settings-name">

              <span>Device Name</span>

              {!editingName ? (
                <div className="device-settings-name-value">

                  <strong>
                    {data?.deviceName || selectedDeviceId}
                  </strong>

                  <button
          className="premium-button-press"
                    type="button"
                    onClick={() => {
                      setNewDeviceName(
                        data?.deviceName || selectedDeviceId
                      );
                      setNameMessage("");
                      setEditingName(true);
                    }}
                    className="device-settings-edit"
                  >
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
                      onClick={saveDeviceName}
                      disabled={savingName}
                      className="device-settings-save premium-button-press"
                    >
                      {savingName ? "Saving..." : "Save"}
                    </button>

                    <button
          className="premium-button-press"
                      type="button"
                      onClick={() => {
                        setEditingName(false);
                        setNameMessage("");
                      }}
                      disabled={savingName}
                      className="device-settings-cancel"
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


            {/* WIFI ONLY INSIDE SETTINGS */}
            <div className="device-settings-row">
              <span>Wi-Fi</span>
              <strong>
                {data?.wifiStatus || "UNKNOWN"}
              </strong>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default DeviceConnection;
