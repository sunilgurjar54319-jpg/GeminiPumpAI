import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("DASHBOARD ERROR:", error);
    console.error("COMPONENT STACK:", info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: "20px",
          fontFamily: "Arial",
          background: "#fff",
          color: "#b00020",
          minHeight: "100vh"
        }}>
          <h2>⚠️ Dashboard Error</h2>

          <pre style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#f5f5f5",
            padding: "15px",
            borderRadius: "8px",
            color: "#111"
          }}>
            {String(this.state.error.stack || this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
