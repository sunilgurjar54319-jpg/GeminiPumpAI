import { useEffect, useState } from "react";

const API = "https://geminipumpai.onrender.com";

function ManualControl({ onCommandSent }) {

  const [isOn, setIsOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Current pump status
  async function loadStatus() {

    try {

      const res = await fetch(
        `${API}/api/status/PUMP001`
      );

      const data = await res.json();

      if (data.status === "ON") {
        setIsOn(true);
      }

      if (data.status === "OFF") {
        setIsOn(false);
      }

    } catch (err) {

      console.log("Status error:", err);

    }

  }


  useEffect(() => {

    loadStatus();

    const timer = setInterval(
      loadStatus,
      5000
    );

    return () => clearInterval(timer);

  }, []);


  async function sendCommand(command) {

    if (loading) return;

    setLoading(true);

    setMessage(
      command === "ON"
        ? "🟢 Pump Starting..."
        : "🔴 Pump Stopping..."
    );


    try {

      const res = await fetch(
        `${API}/api/command/send`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            deviceId: "PUMP001",
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
            ? "🟢 Pump is already ON"
            : "🔴 Pump is already OFF"
        );

        setLoading(false);

        return;
      }


      // Command successfully created
      if (data.$id) {

        setIsOn(command === "ON");

        setMessage(
          command === "ON"
            ? "✅ Pump ON Command Sent"
            : "✅ Pump OFF Command Sent"
        );


        if (onCommandSent) {

          setTimeout(() => {

            onCommandSent();

          }, 3000);

        }

      }

      else {

        setMessage("❌ Command Failed");

      }


    } catch (err) {

      console.log(err);

      setMessage("❌ Server Error");

    }


    setLoading(false);

  }


  function togglePump() {

    const nextCommand = isOn
      ? "OFF"
      : "ON";

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

      <h2>🎮 Manual Control</h2>


      {/* Digital Toggle */}

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
          disabled={loading}

          aria-label={
            isOn
              ? "Turn Pump OFF"
              : "Turn Pump ON"
          }

          style={{
            width: "120px",
            height: "60px",
            border: "none",
            borderRadius: "35px",
            padding: "5px",
            cursor: loading
              ? "not-allowed"
              : "pointer",

            background: isOn
              ? "#16a34a"
              : "#6b7280",

            boxShadow: isOn
              ? "0 0 18px rgba(22,163,74,0.45)"
              : "0 3px 10px rgba(0,0,0,0.2)",

            transition:
              "all 0.25s ease",

            opacity: loading ? 0.7 : 1
          }}
        >

          <span
            style={{
              display: "block",
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              background: "white",

              transform: isOn
                ? "translateX(60px)"
                : "translateX(0px)",

              transition:
                "transform 0.25s ease",

              boxShadow:
                "0 2px 6px rgba(0,0,0,0.25)"
            }}
          />

        </button>


        <div
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            color: isOn
              ? "#15803d"
              : "#dc2626"
          }}
        >

          {loading
            ? "Processing..."
            : isOn
              ? "🟢 PUMP ON"
              : "🔴 PUMP OFF"}

        </div>


        <div
          style={{
            fontSize: "13px",
            color: "#666"
          }}
        >

          Tap switch to turn pump{" "}
          {isOn ? "OFF" : "ON"}

        </div>

      </div>


      <p
        style={{
          fontWeight: "bold",
          fontSize: "16px",
          minHeight: "24px"
        }}
      >

        {message}

      </p>

    </div>

  );

}


export default ManualControl;
