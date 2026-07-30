import { useState } from "react";
import "./App.css";

const API = "https://geminipumpai.onrender.com";

function App() {

  const [voiceText, setVoiceText] = useState("");
  const [result, setResult] = useState("");

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

      const text =
        event.results[0][0].transcript;

      setVoiceText(text);


      try {

        const res = await fetch(
          `${API}/api/gemini/voice`,
          {
            method:"POST",
            headers:{
              "Content-Type":"application/json"
            },
            body:JSON.stringify({
              text:text
            })
          }
        );


        const data = await res.json();

        setResult(
          data.command
          ? "Command: " + data.command
          : "Samajh nahi aaya"
        );


      } catch(error){

        setResult("Server Error");

      }

    };


    recognition.start();

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


      <h3>
        Aapne bola:
      </h3>

      <p>{voiceText}</p>


      <h3>
        Status:
      </h3>

      <p>{result}</p>


    </div>
  );
}


export default App;
