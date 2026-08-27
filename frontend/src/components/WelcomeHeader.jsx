import { useState } from "react";
import { account } from "../appwrite";

function WelcomeHeader({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const name = user?.name?.trim() || "User";
  const initial = name.charAt(0).toUpperCase();

  async function handleLogout() {
    try {
      await account.deleteSession("current");
    } catch (err) {
      console.log("Logout session error:", err);
    }

    sessionStorage.removeItem("geminiPumpJWT");
    setMenuOpen(false);

    if (onLogout) {
      onLogout();
    }
  }

  function handleEditProfile() {
    setMenuOpen(false);
    alert("Edit Profile");
  }

  return (
    <div className="welcome-header">
      <div className="welcome-header-text">
        <h2>Welcome, {name}</h2>
      </div>

      <div className="profile-menu-wrapper">
        <button
          type="button"
          className="profile-avatar"
          aria-label="Account Settings"
          onClick={() => setMenuOpen(prev => !prev)}
        >
          {initial}
        </button>

        {menuOpen && (
          <div className="profile-menu">
            <button type="button" onClick={handleEditProfile}>
              Edit Profile
            </button>

            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WelcomeHeader;
