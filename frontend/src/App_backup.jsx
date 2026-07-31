import { useState } from "react";
import Header from "./components/Header";
import StatusCard from "./components/StatusCard";
import ManualControl from "./components/ManualControl";
import Schedule from "./components/Schedule";
import HistoryCard from "./components/HistoryCard";
import "./App.css";

function App() {

  const [refresh, setRefresh] = useState(false);

  function refreshStatus() {
    setRefresh(!refresh);
  }

  return (

    <div
      style={{
        maxWidth: "700px",
        margin: "auto",
        padding: "20px",
      }}
    >

      <Header />

      <StatusCard refresh={refresh} />

      <ManualControl onCommandSent={refreshStatus} />

      <Schedule />

      <HistoryCard />

    </div>

  );

}

export default App;
