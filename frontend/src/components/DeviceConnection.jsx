import { useEffect, useState } from "react";

import { authFetch, deviceFetch } from "../api";
const DEVICE_ID = "PUMP001";

function DeviceConnection() {
  const [data, setData] = useState(null);
  const [pumpStatus, setPumpStatus] = useState("UNKNOWN");

  const [online, setOnline] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState("");

  // =========================================
  // DEVICE + SENSOR STATUS
  // =========================================

  async function fetchDeviceStatus() {
    try {
      const res = await deviceFetch(
        `/api/device/${DEVICE_ID}`,
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
        `/api/status/${DEVICE_ID}`,
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
        `/api/device/${DEVICE_ID}/name`,
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

    fetchDeviceStatus();
    fetchPumpStatus();

    const timer =
      setInterval(() => {

        fetchDeviceStatus();
        fetchPumpStatus();

      }, 5000);

    return () =>
      clearInterval(timer);

  }, []);


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

    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "15px",
        padding: "20px",
        marginTop: "20px",
        background: "#fff"
      }}
    >

      {/* ================================= */}
      {/* DEVICE NAME */}
      {/* ================================= */}

      <h2>
        📡{" "}
        {data?.deviceName ||
          "ESP32 Device"}
      </h2>


      {/* ================================= */}
      {/* ONLINE */}
      {/* ================================= */}

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
            background:
              online
                ? "#16a34a"
                : "#dc2626",
            display: "inline-block"
          }}
        />

        {online
          ? "🟢 ESP32 Online"
          : "🔴 ESP32 Offline"}

      </div>


      {/* ================================= */}
      {/* WIFI */}
      {/* ================================= */}

      <div
        style={{
          marginTop: "12px"
        }}
      >
        <b>📶 Wi-Fi:</b>{" "}
        {data?.wifiStatus ||
          "UNKNOWN"}
      </div>


      {/* ================================= */}
      {/* DEVICE NAME EDIT */}
      {/* ================================= */}

      <div
        style={{
          marginTop: "8px"
        }}
      >

        <b>📛 Device Name:</b>{" "}

        {!editingName ? (

          <>

            <span>
              {data?.deviceName ||
                DEVICE_ID}
            </span>

            <button
              onClick={() => {

                setNewDeviceName(
                  data?.deviceName ||
                  DEVICE_ID
                );

                setNameMessage("");

                setEditingName(true);

              }}

              style={{
                marginLeft: "10px",
                padding: "5px 10px",
                border:
                  "1px solid #ccc",
                borderRadius: "6px",
                background: "#f5f5f5",
                cursor: "pointer"
              }}
            >
              ✏️ Edit
            </button>

          </>

        ) : (

          <div
            style={{
              marginTop: "8px"
            }}
          >

            <input
              value={newDeviceName}
              onChange={(e) =>
                setNewDeviceName(
                  e.target.value
                )
              }
              placeholder="Device name"
              style={{
                padding: "8px",
                border:
                  "1px solid #ccc",
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
              {savingName
                ? "Saving..."
                : "Save"}
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
                border:
                  "1px solid #ccc",
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


      {/* ================================= */}
      {/* DEVICE ID */}
      {/* ================================= */}

      <div
        style={{
          marginTop: "8px"
        }}
      >
        <b>🆔 Device ID:</b>{" "}
        {DEVICE_ID}
      </div>


      {/* ================================= */}
      {/* LAST SEEN */}
      {/* ================================= */}

      <div
        style={{
          marginTop: "8px"
        }}
      >

        <b>🕐 Last Seen:</b>{" "}

        {data?.lastSeen
          ? new Date(
              data.lastSeen
            ).toLocaleString(
              "en-IN"
            )
          : "Never"}

      </div>


      {/* ================================= */}
      {/* PUMP STATUS */}
      {/* ================================= */}

      <div
        style={{
          marginTop: "18px",
          padding: "14px",
          borderRadius: "10px",
          background:
            pumpStatus === "ON"
              ? "#dcfce7"
              : pumpStatus === "OFF"
              ? "#fee2e2"
              : "#f3f4f6"
        }}
      >

        <b>🚰 Pump Status:</b>{" "}

        {pumpStatus === "ON" && (
          <span
            style={{
              color: "#15803d",
              fontWeight: "bold"
            }}
          >
            🟢 ON
          </span>
        )}

        {pumpStatus === "OFF" && (
          <span
            style={{
              color: "#b91c1c",
              fontWeight: "bold"
            }}
          >
            🔴 OFF
          </span>
        )}

        {pumpStatus === "UNKNOWN" && (
          <span
            style={{
              color: "#6b7280",
              fontWeight: "bold"
            }}
          >
            ⚪ UNKNOWN
          </span>
        )}

      </div>


      {/* ================================= */}
      {/* CONNECTED SENSORS */}
      {/* ================================= */}

      {(hasVoltage ||
        hasCurrent ||
        hasFloat ||
        hasPressure ||
        hasTemperature) && (

        <div
          style={{
            marginTop: "16px",
            paddingTop: "12px",
            borderTop:
              "1px solid #eee"
          }}
        >

          <b>📡 Connected Sensors</b>


          {/* VOLTAGE */}

          {hasVoltage && (

            <div
              style={{
                marginTop: "10px"
              }}
            >
              ⚡ Voltage:{" "}
              <b>
                Sensor Connected
              </b>

              {data?.voltage !==
                undefined && (
                <>
                  {" "}
                  —{" "}
                  {data.voltage} V
                </>
              )}
            </div>

          )}


          {/* CURRENT */}

          {hasCurrent && (

            <div
              style={{
                marginTop: "8px"
              }}
            >
              🔌 Current:{" "}
              <b>
                Sensor Connected
              </b>

              {data?.current !==
                undefined && (
                <>
                  {" "}
                  —{" "}
                  {data.current} A
                </>
              )}
            </div>

          )}


          {/* WATER LEVEL / FLOAT */}

          {hasFloat && (

            <div
              style={{
                marginTop: "8px"
              }}
            >
              💧 Water Level:{" "}
              <b>
                Sensor Connected
              </b>

              {data?.waterLevel !==
                undefined && (
                <>
                  {" "}
                  —{" "}
                  {data.waterLevel}
                </>
              )}
            </div>

          )}


          {/* PRESSURE */}

          {hasPressure && (

            <div
              style={{
                marginTop: "8px"
              }}
            >
              💨 Pressure:{" "}
              <b>
                Sensor Connected
              </b>

              {data?.pressure !==
                undefined && (
                <>
                  {" "}
                  —{" "}
                  {data.pressure} PSI
                </>
              )}
            </div>

          )}


          {/* TEMPERATURE */}

          {hasTemperature && (

            <div
              style={{
                marginTop: "8px"
              }}
            >
              🌡️ Temperature:{" "}
              <b>
                Sensor Connected
              </b>

              {data?.temperature !==
                undefined && (
                <>
                  {" "}
                  —{" "}
                  {data.temperature} °C
                </>
              )}
            </div>

          )}

        </div>

      )}


      {/* ================================= */}
      {/* NO SENSOR */}
      {/* ================================= */}

      {!hasVoltage &&
        !hasCurrent &&
        !hasFloat &&
        !hasPressure &&
        !hasTemperature && (

        <div
          style={{
            marginTop: "16px",
            paddingTop: "12px",
            borderTop:
              "1px solid #eee",
            color: "#6b7280"
          }}
        >
          📡 कोई sensor connected नहीं है।
        </div>

      )}

    </div>
  );
}

export default DeviceConnection;
