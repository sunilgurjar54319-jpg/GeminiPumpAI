import { useState } from "react";
import "./App.css";

const API = "https://geminipumpai.onrender.com";

function App() {
  const [voiceText, setVoiceText] = useState("");
  const [result, setResult] = useState("");

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  async function startVoice() {
    if (!SpeechRecognition) {
      alert("Voice support nahi hai");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "hi-IN";
    recognition.continuous = false;

    recognition.onstart = () => {
      setResult("Sun raha hu...");
    };

    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;

      setVoiceText(text);

      try {
        const res = await fetch(`${API}/api/gemini/voice`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
          }),
        });

        const data = await res.json();

        setResult(
          data.command
            ? "Command: " + data.command
            : "Samajh nahi aaya"
        );
      } catch (error) {
        setResult("Server Error");
      }
    };

    recognition.start();
  }

  async function saveSchedule() {
    try {
      const res = await fetch(`${API}/api/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId: "PUMP001",
          startTime,
          endTime,
          days: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
          enabled: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setScheduleMessage("✅ Schedule Saved");
      } else {
        setScheduleMessage("❌ Failed");
      }
    } catch (err) {
      setScheduleMessage("Server Error");
    }
  }

  return (
    <div>

      <h1>Gemini Pump AI</h1>

      <button
        className="voice"
        onClick={startVoice}
      >
        🎤 Voice Command
      </button>

      <h3>Aapne bola:</h3>

      <p>{voiceText}</p>

      <h3>Status:</h3>

      <p>{result}</p>

      <hr />

      <h2>Schedule Pump</h2>

      <p>Start Time</p>

      <input
        type="time"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
      />

      <br />
      <br />

      <p>End Time</p>

      <input
        type="time"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
      />

      <br />
      <br />

      <button onClick={saveSchedule}>
        Save Schedule
      </button>

      <p>{scheduleMessage}</p>

    </div>
  );
}

export default App;
