import { useState } from "react";

import Header from "./components/Header";
import StatusCard from "./components/StatusCard";
import ManualControl from "./components/ManualControl";
import VoiceControl from "./components/VoiceControl";
import Schedule from "./components/Schedule";
import HistoryCard from "./components/HistoryCard";
import StatsCard from "./components/StatsCard";

import "./App.css";


function App() {

  const [refresh, setRefresh] = useState(false);


  function refreshStatus() {

    setRefresh(!refresh);

  }


  return (

    <div className="dashboard">

      <Header />


      <div className="grid">


        <div className="card">

          <StatusCard
            refresh={refresh}
          />

        </div>


        <div className="card">

          <ManualControl
            onCommandSent={refreshStatus}
          />

        </div>


        <div className="card">

          <VoiceControl
            onCommandSent={refreshStatus}
          />

        </div>


        <div className="card">

          <StatsCard
            refresh={refresh}
          />

        </div>


        <div className="card">

          <Schedule refresh={refresh} />

        </div>


        <div className="card full">

          <HistoryCard />

        </div>


      </div>


    </div>

  );

}


export default App;
