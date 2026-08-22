import { useEffect, useState } from "react";
import { getStats } from "../api";


function StatsCard({ refresh, deviceName, selectedDeviceId }) {


const [stats,setStats]=useState(null);



async function load(){

 try{

 const data = await getStats(selectedDeviceId);

 setStats(data);

 }
 catch(err){

 console.log(err);

 }

}



useEffect(()=>{

 load();

},[refresh]);



return(

<div>

<h2>📊 {deviceName || "Pump"} Statistics</h2>


{

stats ?

<>

<p>🟢 ON : {stats.totalON}</p>

<p>🔴 OFF : {stats.totalOFF}</p>

<p>📜 Total : {stats.totalRecords}</p>


</>

:

<p>Loading...</p>

}



</div>


);


}


export default StatsCard;
