import { useEffect, useState } from "react";
import { getStatus } from "../api";

const API = "https://geminipumpai.onrender.com";
const DEVICE_ID = "PUMP001";

// Heartbeat 30 seconds se purana ho to ESP32 offline
const ONLINE_TIMEOUT = 30000;

function StatusCard({ refresh }) {

  // =========================================
  // PUMP STATUS
  // =========================================

  const [status, setStatus] = useState("OFF");
  const [updated, setUpdated] = useState("");

  // =========================================
  // ESP32 / WIFI STATUS
  // =========================================

  const [wifiStatus, setWifiStatus] = useState("UNKNOWN");
  const [lastSeen, setLastSeen] = useState("");
  const [espOnline, setEspOnline] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // =========================================
  // LOAD PUMP STATUS
  // =========================================

  async function loadStatus() {

    try {

      setLoading(true);
      setError("");

      const data = await getStatus(DEVICE_ID);

      console.log("Pump Status API:", data);

      if (data.success === false) {
        throw new Error(
          data.message || "Status API failed"
        );
      }

      if (data.status) {

        setStatus(
          String(data.status).toUpperCase()
        );

      }

      if (data.updatedAt) {

        setUpdated(
          new Date(
            data.updatedAt
          ).toLocaleString("en-IN")
        );

      }

    } catch (err) {

      console.log(
        "Pump Status Error:",
        err
      );

      setError(
        "❌ Pump status update नहीं हो पाया"
      );

    } finally {

      setLoading(false);

    }

  }


  // =========================================
  // LOAD ESP32 DEVICE STATUS
  // =========================================

  async function loadDeviceStatus() {

    try {

      const res = await fetch(
        `${API}/api/device/${DEVICE_ID}?t=${Date.now()}`,
        {
          cache: "no-store"
        }
      );

      if (!res.ok) {
        throw new Error(
          "Device API HTTP " + res.status
        );
      }

      const data = await res.json();

      console.log(
        "ESP32 Device API:",
        data
      );


      if (data.wifiStatus) {

        const wifi =
          String(
            data.wifiStatus
          ).toUpperCase();

        setWifiStatus(wifi);

      }


      if (data.lastSeen) {

        setLastSeen(data.lastSeen);

        const lastSeenTime =
          new Date(
            data.lastSeen
          ).getTime();

        const age =
          Date.now() - lastSeenTime;

        const connected =
          String(
            data.wifiStatus || ""
          ).toUpperCase() === "CONNECTED";

        setEspOnline(
          connected &&
          age >= 0 &&
          age <= ONLINE_TIMEOUT
        );

      } else {

        setEspOnline(false);

      }

    } catch (err) {

      console.log(
        "ESP32 Status Error:",
        err
      );

      setWifiStatus("UNKNOWN");
      setEspOnline(false);

    }

  }


  // =========================================
  // REFRESH BOTH
  // =========================================

  async function refreshAll() {

    await Promise.all([
      loadStatus(),
      loadDeviceStatus()
    ]);

  }


  useEffect(() => {

    refreshAll();

    const timer =
      setInterval(
        refreshAll,
        5000
      );

    return () =>
      clearInterval(timer);

  }, [refresh]);


  const isOn =
    status === "ON";


  // =========================================
  // LAST SEEN DISPLAY
  // =========================================

  let lastSeenText = "Never";

  if (lastSeen) {

    lastSeenText =
      new Date(
        lastSeen
      ).toLocaleString("en-IN");

  }


  return (

    <div className="status-card">

      <h2>📡 Pump Status</h2>


      {/* =====================================
          ESP32 CONNECTION
      ===================================== */}

      <div
        style={{
          padding: "14px",
          marginBottom: "18px",
          borderRadius: "12px",
          background: espOnline
            ? "#ecfdf5"
            : "#fef2f2",
          border: espOnline
            ? "1px solid #86efac"
            : "1px solid #fca5a5"
        }}
      >

        <div
          style={{
            fontSize: "18px",
            fontWeight: "bold"
          }}
        >

          {espOnline
            ? "🟢 ESP32 Online"
            : "🔴 ESP32 Offline"}

        </div>


        <div
          style={{
            marginTop: "8px"
          }}
        >

          <strong>📶 Wi-Fi:</strong>{" "}

          {wifiStatus === "CONNECTED"
            ? "Connected"
            : wifiStatus}

        </div>


        <div
          style={{
            marginTop: "5px",
            fontSize: "14px"
          }}
        >

          <strong>🕐 Last Seen:</strong>{" "}

          {lastSeenText}

        </div>

      </div>


      {/* =====================================
          PUMP STATUS
      ===================================== */}

      <div
        className={
          isOn
            ? "status-on"
            : "status-off"
        }
      >

        {isOn
          ? "🟢 Pump Running"
          : "🔴 Pump Stopped"}

      </div>


      <p>

        <strong>Device:</strong>{" "}
        {DEVICE_ID}

        <br />

        <strong>Pump Status:</strong>{" "}

        {isOn
          ? "ON"
          : "OFF"}

        <br />

        <strong>Last Pump Update:</strong>

        <br />

        {updated || "Waiting..."}

      </p>


      <button
        onClick={refreshAll}
        disabled={loading}
      >

        {loading
          ? "⏳ Refreshing..."
          : "🔄 Refresh"}

      </button>


      {error && (

        <p
          style={{
            color: "red"
          }}
        >

          {error}

        </p>

      )}

    </div>

  );

}

export default StatusCard;
