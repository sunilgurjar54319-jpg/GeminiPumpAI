import { useState } from "react";

const API = "https://geminipumpai.onrender.com";

function ManualControl() {
  const [message, setMessage] = useState("");

  async function sendCommand(command) {
    try {
      const res = await fetch(`${API}/api/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId: "PUMP001",
          command: command,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(`✅ ${command} Command Sent`);
      } else {
        setMessage("❌ Failed");
      }
    } catch (err) {
      setMessage("❌ Server Error");
    }
  }

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "15px",
        marginBottom: "20px",
      }}
    >
      <h2>🎮 Manual Control</h2>

      <button onClick={() => sendCommand("ON")}>
        🟢 Pump ON
      </button>

      <button
        onClick={() => sendCommand("OFF")}
        style={{ marginLeft: "10px" }}
      >
        🔴 Pump OFF
      </button>

      <p>{message}</p>
    </div>
  );
}

export default ManualControl;
