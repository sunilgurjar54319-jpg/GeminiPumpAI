import Icon from "./Icon";
function Header({ deviceName }) {
  return (
    <header className="app-header">
      <div className="header-inner">

        <div className="brand">
          <div className="brand-icon">

          </div>

          <div>
            <h1>Gemini Pump AI</h1>
            <p>{deviceName || "Smart Water Pump Controller"}</p>
          </div>
        </div>

        <div className="connection-badge">
          <span className="connection-dot"></span>
          System Online
        </div>

      </div>
    </header>
  );
}

export default Header;
