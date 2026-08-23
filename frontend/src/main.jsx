import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function ModuleErrorScreen({ error }) {
  return (
    <div style={{
      padding: "24px",
      fontFamily: "Arial, sans-serif",
      background: "#fff",
      color: "#111",
      minHeight: "100vh"
    }}>
      <h2 style={{ color: "#b00020" }}>
        ⚠️ Frontend Module Error
      </h2>

      <p>
        App.jsx या उसके किसी imported component को load करते समय error आया।
      </p>

      <pre style={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        background: "#f5f5f5",
        padding: "16px",
        borderRadius: "8px",
        color: "#111"
      }}>
        {String(error?.stack || error)}
      </pre>
    </div>
  );
}

function AppLoader() {
  const [App, setApp] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    import("./App.jsx")
      .then((module) => {
        setApp(() => module.default);
      })
      .catch((err) => {
        console.error("APP MODULE LOAD ERROR:", err);
        setError(err);
      });
  }, []);

  if (error) {
    return <ModuleErrorScreen error={error} />;
  }

  if (!App) {
    return (
      <div style={{
        padding: "30px",
        fontFamily: "Arial, sans-serif"
      }}>
        Loading Gemini Pump AI...
      </div>
    );
  }

  return <App />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppLoader />
  </StrictMode>
);
