import Header from "./components/Header";
import StatusCard from "./components/StatusCard";
import ManualControl from "./components/ManualControl";
import "./App.css";

function App() {
  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "auto",
        padding: "20px",
      }}
    >
      <Header />

      <StatusCard />

      <ManualControl />
    </div>
  );
}

export default App;
