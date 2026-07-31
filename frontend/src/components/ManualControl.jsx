import { useState } from "react";

const API = "http://localhost:5001";

function ManualControl({ onCommandSent }) {

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);


  async function sendCommand(command) {

    setLoading(true);

    setMessage(
      command === "ON"
      ? "🟢 Pump Starting..."
      : "🔴 Pump Stopping..."
    );


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
          command==="ON"
          ? "✅ Pump ON Command Sent"
          : "✅ Pump OFF Command Sent"
        );


        if(onCommandSent){

          setTimeout(()=>{

            onCommandSent();

          },3000);

        }


      }
      else{

        setMessage("❌ Command Failed");

      }


    }
    catch(err){

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
padding:"25px",
marginTop:"20px",
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
border:"none",
borderRadius:"30px",
padding:"15px 40px",
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

background:"#d32f2f",
color:"white",
border:"none",
borderRadius:"30px",
padding:"15px 40px",
fontSize:"18px",
margin:"10px"

}}

>

🔴 Pump OFF

</button>



<p
style={{
fontWeight:"bold",
fontSize:"18px"
}}
>

{message}

</p>


</div>

);

}


export default ManualControl;
