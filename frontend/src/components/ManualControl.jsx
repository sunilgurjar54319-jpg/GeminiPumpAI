import { useEffect, useState } from "react";
import { authFetch, getDevice } from "../api";

const DEVICE_ID = "PUMP001";
const ONLINE_TIMEOUT = 60000;

function ManualControl({ onCommandSent, deviceName }) {

  const displayName = deviceName || "Pump";

  const [isOn, setIsOn] = useState(false);
  const [deviceOnline, setDeviceOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // =========================================
  // Check ESP32 connection
  // =========================================

  async function loadDeviceStatus() {

    try {

      const data = await getDevice(DEVICE_ID);

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
        `/api/status/${DEVICE_ID}`,
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

    loadDeviceStatus();

    const timer = setInterval(
      loadDeviceStatus,
      5000
    );

    return () => clearInterval(timer);

  }, []);


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

    // IMPORTANT:
    // Manual command cannot be sent while offline.

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
        ? `🟢 ${displayName} Starting...`
        : `🔴 ${displayName} Stopping...`
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
            deviceId: DEVICE_ID,
            command
          })
        }
      );


      const data = await res.json();


      // Already same state
      if (data.ignored) {

        setIsOn(data.status === "ON");

        setMessage(
          data.status === "ON"
            ? `🟢 ${displayName} is already ON`
            : `🔴 ${displayName} is already OFF`
        );

        setLoading(false);

        return;
      }


      // Command successfully created
      if (data.$id) {

        setIsOn(command === "ON");

        setMessage(
          command === "ON"
            ? `✅ ${displayName} ON Command Sent`
            : `✅ ${displayName} OFF Command Sent`
        );


        if (onCommandSent) {

          setTimeout(() => {

            onCommandSent();

          }, 3000);

        }

      } else {

        setMessage(
          "❌ Command Failed"
        );

      }


    } catch (err) {

      console.log(
        "Command error:",
        err
      );

      setMessage(
        "❌ Server Error"
      );

    }


    setLoading(false);

  }


  // =========================================
  // Manual Toggle
  // =========================================

  function togglePump() {

    // Extra protection
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

    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "15px",
        padding: "25px",
        marginTop: "20px",
        textAlign: "center"
      }}
    >

      <h2>🎮 {displayName} Manual Control</h2>


      {/* =====================================
          OFFLINE MESSAGE
      ===================================== */}

      {!deviceOnline && (

        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            borderRadius: "10px",
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#c2410c",
            fontWeight: "bold",
            lineHeight: "1.5"
          }}
        >
          RMU FW Update available or Pump is not connected to network
        </div>

      )}


      {/* =====================================
          DIGITAL TOGGLE
      ===================================== */}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px"
        }}
      >

        <button

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

          style={{
            width: "120px",
            height: "60px",
            border: "none",
            borderRadius: "35px",
            padding: "5px",

            cursor:
              loading || !deviceOnline
                ? "not-allowed"
                : "pointer",

            background:
              !deviceOnline
                ? "#d1d5db"
                : isOn
                  ? "#16a34a"
                  : "#6b7280",

            boxShadow:
              deviceOnline && isOn
                ? "0 0 18px rgba(22,163,74,0.45)"
                : "0 3px 10px rgba(0,0,0,0.2)",

            transition:
              "all 0.25s ease",

            opacity:
              !deviceOnline
                ? 0.55
                : loading
                  ? 0.7
                  : 1
          }}
        >

          <span
            style={{
              display: "block",
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              background: "white",

              transform:
                isOn
                  ? "translateX(60px)"
                  : "translateX(0px)",

              transition:
                "transform 0.25s ease",

              boxShadow:
                "0 2px 6px rgba(0,0,0,0.25)"
            }}
          />

        </button>


        {/* =====================================
            MOTOR STATUS
            ONLY WHEN ONLINE
        ===================================== */}

        {deviceOnline && (

          <div
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              color:
                isOn
                  ? "#15803d"
                  : "#dc2626"
            }}
          >

            {loading
              ? "Processing..."
              : isOn
                ? `🟢 ${displayName} RUNNING`
                : `🔴 ${displayName} STOPPED`}

          </div>

        )}


        {/* =====================================
            SWITCH DESCRIPTION
        ===================================== */}

        {deviceOnline && (

          <div
            style={{
              fontSize: "13px",
              color: "#666"
            }}
          >

            Tap switch to control {displayName}{" "}
            {isOn ? "OFF" : "ON"}

          </div>

        )}

      </div>


      {/* =====================================
          COMMAND MESSAGE
      ===================================== */}

      {deviceOnline && (

        <p
          style={{
            fontWeight: "bold",
            fontSize: "16px",
            minHeight: "24px"
          }}
        >
          {message}
        </p>

      )}

    </div>

  );

}


export default ManualControl;
