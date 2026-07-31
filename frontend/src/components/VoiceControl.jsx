import { useState } from "react";
import { sendVoice } from "../api";

function VoiceControl({ onCommandSent }) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage("❌ Voice recognition browser में supported नहीं है");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    setListening(true);
    setMessage("🎙️ सुन रहा हूँ...");

    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;

      setMessage(`🗣️ आपने कहा: ${text}`);

      try {
        const data = await sendVoice(text);

        console.log("Voice API:", data);

        if (!data.success) {
          setMessage(
            `❌ ${data.message || "Command समझ नहीं आया"}`
          );
          return;
        }

        // =========================
        // IMMEDIATE COMMAND
        // =========================

        if (data.type === "IMMEDIATE") {
          if (data.command === "ON") {
            setMessage("✅ Pump ON Command Sent");
          } else if (data.command === "OFF") {
            setMessage("✅ Pump OFF Command Sent");
          }

          if (onCommandSent) {
            onCommandSent();
          }

          return;
        }

        // =========================
        // ONE-TIME SCHEDULE
        // =========================

        if (data.type === "SCHEDULE") {
          const commandText =
            data.command === "ON"
              ? "मोटर चालू"
              : "मोटर बंद";

          const dateText =
            data.scheduledDate || "";

          const timeText =
            `${String(data.hour).padStart(2, "0")}:${String(
              data.minute
            ).padStart(2, "0")}`;

          setMessage(
            `✅ Schedule Set: ${dateText} ${timeText} → ${commandText}`
          );

          if (onCommandSent) {
            onCommandSent();
          }

          return;
        }

        // =========================
        // RECURRING SCHEDULE
        // =========================

        if (data.type === "RECURRING") {
          const commandText =
            data.command === "ON"
              ? "मोटर चालू"
              : "मोटर बंद";

          const timeText =
            `${String(data.hour).padStart(2, "0")}:${String(
              data.minute
            ).padStart(2, "0")}`;

          setMessage(
            `🔄 Recurring Schedule Set: रोज़ ${timeText} → ${commandText}`
          );

          if (onCommandSent) {
            onCommandSent();
          }

          return;
        }

        // =========================
        // UNKNOWN RESPONSE
        // =========================

        setMessage("✅ Command received");

        if (onCommandSent) {
          onCommandSent();
        }

      } catch (error) {
        console.log("Voice Error:", error);
        setMessage("❌ Server Error");
      }
    };

    recognition.onerror = (event) => {
      console.log("Speech Error:", event);

      setMessage("❌ Voice recognition error");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
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
      <h2>🎙️ Gemini Voice Control</h2>

      <button
        onClick={startListening}
        disabled={listening}
        style={{
          border: "none",
          borderRadius: "30px",
          padding: "15px 35px",
          fontSize: "18px",
          cursor: listening ? "not-allowed" : "pointer"
        }}
      >
        {listening
          ? "🎙️ सुन रहा हूँ..."
          : "🎙️ बोलकर Pump Control करें"}
      </button>

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

export default VoiceControl;
