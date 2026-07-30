import { useEffect, useState } from "react";
import "./App.css";


const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;



function App() {


  const [status, setStatus] = useState("LOADING");
  const [history, setHistory] = useState([]);
  const [voiceText, setVoiceText] = useState("");




  async function loadStatus(){

    try{

      const res = await fetch(
        "http://localhost:5001/api/status/PUMP001"
      );

      const data = await res.json();

      setStatus(data.status || "UNKNOWN");


    }catch{

      setStatus("OFFLINE");

    }

  }




  async function loadHistory(){

    try{

      const res = await fetch(
        "http://localhost:5001/api/history/PUMP001"
      );


      const data = await res.json();

      setHistory(data.reverse());


    }catch(err){

      console.log(err);

    }

  }





  // SEND + COMPLETE + STATUS UPDATE

  async function sendCommand(command){


    try{


      const res = await fetch(

        "http://localhost:5001/api/command/send",

        {

          method:"POST",

          headers:{
            "Content-Type":"application/json"
          },

          body:JSON.stringify({

            deviceId:"PUMP001",
            command:command

          })

        }

      );



      const data = await res.json();




      await fetch(

        "http://localhost:5001/api/command/complete",

        {

          method:"POST",

          headers:{
            "Content-Type":"application/json"
          },

          body:JSON.stringify({

            commandId:data.$id

          })

        }

      );





      await fetch(

        "http://localhost:5001/api/status/update",

        {

          method:"POST",

          headers:{
            "Content-Type":"application/json"
          },

          body:JSON.stringify({

            deviceId:"PUMP001",
            status:command

          })

        }

      );



      loadStatus();

      loadHistory();



    }

    catch(err){

      console.log(err);

    }


  }





  // VOICE CONTROL

  function startVoice(){


    if(!SpeechRecognition){

      alert("Voice not supported");

      return;

    }



    const recognition = new SpeechRecognition();


    recognition.lang="hi-IN";


    recognition.start();



    recognition.onresult=(event)=>{


      const text =
      event.results[0][0]
      .transcript
      .toLowerCase();



      setVoiceText(text);




      if(

        text.includes("पंप चालू") ||
        text.includes("मोटर चालू") ||
        text.includes("pump on") ||
        text.includes("pump chalu")

      ){

        sendCommand("ON");

      }





      if(

        text.includes("पंप बंद") ||
        text.includes("मोटर बंद") ||
        text.includes("pump off") ||
        text.includes("pump band")

      ){

        sendCommand("OFF");

      }



    };


  }





  useEffect(()=>{


    loadStatus();

    loadHistory();



    const timer=setInterval(()=>{

      loadStatus();

    },5000);



    return ()=>clearInterval(timer);


  },[]);






  return (

    <div className="container">


      <h1>🚜 Gemini Pump AI</h1>



      <div className="card">


        <h2>PUMP001</h2>


        <h3>
          Status:
          <span className="offline">
            {status}
          </span>
        </h3>




        <button
        className="on"
        onClick={()=>sendCommand("ON")}
        >
          PUMP ON
        </button>




        <button
        className="off"
        onClick={()=>sendCommand("OFF")}
        >
          PUMP OFF
        </button>




        <br/>



        <button
        className="voice"
        onClick={startVoice}
        >

        🎤 Voice Command

        </button>



        <p>
          Heard: {voiceText}
        </p>



      </div>





      <div className="card">


        <h2>History</h2>



        {

          history.map((item)=>(

            <p key={item.$id}>

              {item.command} - {item.result}

            </p>

          ))

        }



      </div>



    </div>

  );


}



export default App;
