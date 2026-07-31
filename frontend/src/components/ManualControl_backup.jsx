import { useState } from "react";

const API = "https://geminipumpai.onrender.com";

function ManualControl({ onCommandSent }) {

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);


  async function sendCommand(command) {

    setLoading(true);
    setMessage("⏳ Sending Command...");

    try {

      const res = await fetch(`${API}/api/command/send`, {

        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({
          deviceId:"PUMP001",
          command
        })

      });


      const data = await res.json();


      if(data.$id){

        setMessage(
          command === "ON"
          ? "✅ Pump ON Command Sent"
          : "✅ Pump OFF Command Sent"
        );


        if(onCommandSent){
          onCommandSent();
        }


      }else{

        setMessage("❌ Command Failed");

      }


    }catch(err){

      console.log(err);
      setMessage("❌ Server Error");

    }


    setLoading(false);

  }



  return (

    <div
      style={{
        border:"1px solid #ddd",
        borderRadius:"15px",
        padding:"20px",
        marginBottom:"20px",
        textAlign:"center"
      }}
    >

      <h2>🎮 Manual Control</h2>


      <button

        disabled={loading}

        onClick={()=>sendCommand("ON")}

        style={{
          background:"#2e7d32",
          color:"white",
          padding:"14px 35px",
          border:"none",
          borderRadius:"30px",
          fontSize:"18px",
          margin:"10px"
        }}

      >
        🟢 Pump ON

      </button>



      <button

        disabled={loading}

        onClick={()=>sendCommand("OFF")}

        style={{
          background:"#c62828",
          color:"white",
          padding:"14px 35px",
          border:"none",
          borderRadius:"30px",
          fontSize:"18px",
          margin:"10px"
        }}

      >
        🔴 Pump OFF

      </button>


      <h3>
        {message}
      </h3>


    </div>

  );

}


export default ManualControl;
