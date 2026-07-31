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

      const text =
        event.results[0][0].transcript;

      setMessage(`🗣️ आपने कहा: ${text}`);

      try {

        const data = await sendVoice(text);

        if (data.success) {

          setMessage(
            data.command === "ON"
              ? "✅ Pump ON Command Sent"
              : "✅ Pump OFF Command Sent"
          );

          if (onCommandSent) {
            onCommandSent();
          }

        } else {

          setMessage("❌ Command समझ नहीं आया");

        }

      } catch (error) {

        console.log(error);
        setMessage("❌ Server Error");

      }

    };

    recognition.onerror = () => {
      setMessage("❌ Voice recognition error");
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
          cursor: "pointer"
        }}
      >

        {listening
          ? "🎙️ सुन रहा हूँ..."
          : "🎙️ बोलकर Pump Control करें"}

      </button>

      <p
        style={{
          fontWeight: "bold",
          fontSize: "16px"
        }}
      >
        {message}
      </p>

    </div>

  );
}

export default VoiceControl;
