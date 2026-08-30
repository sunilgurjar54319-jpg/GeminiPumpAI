import { useState } from "react";
import { account } from "../appwrite";

function Login({ onLogin, onRegister }) {
  const params = new URLSearchParams(window.location.search);
  const recoveryUserId = params.get("userId");
  const recoverySecret = params.get("secret");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isRecovery = !!(recoveryUserId && recoverySecret);

    const glassInputStyle = {
      width: "100%",
      boxSizing: "border-box",
      padding: "14px 16px",
      borderRadius: "16px",
      border: "1px solid rgba(255,255,255,0.72)",
      background: "rgba(255,255,255,0.58)",
      color: "#111827",
      fontSize: "16px",
      fontWeight: "500",
      outline: "none",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.95), 0 6px 20px rgba(15,23,42,0.07)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      transition: "box-shadow 0.2s ease, transform 0.2s ease"
    };

    const glassPrimaryButtonStyle = {
      width: "100%",
      padding: "14px 16px",
      borderRadius: "16px",
      border: "1px solid rgba(255,255,255,0.62)",
      background:
        "linear-gradient(145deg, rgba(18,54,107,0.96), rgba(30,79,150,0.94))",
      color: "#ffffff",
      fontSize: "16px",
      fontWeight: "700",
      cursor: loading ? "not-allowed" : "pointer",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.42), 0 10px 30px rgba(10,35,80,0.34)",
      backdropFilter: "blur(20px) saturate(170%)",
      WebkitBackdropFilter: "blur(20px) saturate(170%)",
      transition: "transform 0.18s ease, box-shadow 0.18s ease"
    };

    const glassSecondaryButtonStyle = {
      width: "100%",
      padding: "13px 16px",
      marginTop: "10px",
      borderRadius: "16px",
      border: "1px solid rgba(255,255,255,0.78)",
      background:
        "linear-gradient(145deg, rgba(255,255,255,0.68), rgba(235,242,255,0.50))",
      color: "#2563eb",
      fontSize: "15px",
      fontWeight: "650",
      cursor: loading ? "not-allowed" : "pointer",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.95), 0 7px 22px rgba(15,23,42,0.07)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      transition: "transform 0.18s ease, box-shadow 0.18s ease"
    };

    const glassLinkButtonStyle = {
      border: "1px solid rgba(255,255,255,0.72)",
      background: "rgba(255,255,255,0.42)",
      color: "#2563eb",
      padding: "8px 13px",
      borderRadius: "13px",
      cursor: loading ? "not-allowed" : "pointer",
      fontSize: "14px",
      fontWeight: "600",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.9), 0 5px 16px rgba(15,23,42,0.06)",
      backdropFilter: "blur(18px) saturate(160%)",
      WebkitBackdropFilter: "blur(18px) saturate(160%)",
      transition: "transform 0.18s ease, box-shadow 0.18s ease"
    };


  async function handleLogin(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email डालना जरूरी है।");
      return;
    }

    if (!password) {
      setError("Password डालना जरूरी है।");
      return;
    }

    setLoading(true);

    try {
      // IMPORTANT:
      // Remove any previous Appwrite session first.
      // Otherwise a previous user's session can be reused and
      // the email/password entered in this login form is ignored.
      try {
        await account.deleteSession("current");
      } catch {
        // No active session — continue normally.
      }

      // Always authenticate using the credentials entered here.
      await account.createEmailPasswordSession(
        email.trim(),
        password
      );

      // Get the newly authenticated user.
      const user = await account.get();

      // Create fresh JWT for backend authentication
      const jwtResult = await account.createJWT();

      sessionStorage.setItem(
        "geminiPumpJWT",
        jwtResult.jwt
      );

      setMessage("Login successful! Welcome back.");
      setTimeout(() => {
        onLogin(user);
      }, 900);

    } catch (err) {
      console.error("Login Error:", err);

      setError(
        err?.message || "Login failed"
      );

    } finally {
      setLoading(false);
    }
  }


  async function handleForgotPassword(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("पहले अपना email डालें।");
      return;
    }

    setLoading(true);

    try {
      const recoveryUrl =
        window.location.origin + window.location.pathname;

      await account.createRecovery(
        email.trim(),
        recoveryUrl
      );

      setMessage(
        "Password reset link आपके email पर भेज दिया गया है।"
      );

    } catch (err) {
      console.error(
        "Password Recovery Error:",
        err
      );

      setError(
        "Password reset email भेजने में समस्या हुई।"
      );

    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError(
        "नया password कम से कम 8 characters का होना चाहिए।"
      );
      return;
    }

    setLoading(true);

    try {
      await account.updateRecovery(
        recoveryUserId,
        recoverySecret,
        newPassword
      );

      // Remove recovery parameters from URL
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      setMessage(
        "Password successfully बदल गया। अब नए password से login करें।"
      );

      setNewPassword("");

    } catch (err) {
      console.error(
        "Password Reset Error:",
        err
      );

      setError(
        "Password reset link invalid या expired है।"
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="auth-screen"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
        background:
          "radial-gradient(circle at 8% 12%, rgba(0,238,255,0.95), transparent 27%), radial-gradient(circle at 92% 10%, rgba(255,20,147,0.92), transparent 28%), radial-gradient(circle at 82% 82%, rgba(124,58,237,0.95), transparent 34%), radial-gradient(circle at 18% 88%, rgba(37,99,235,0.92), transparent 32%), radial-gradient(circle at 50% 45%, rgba(168,85,247,0.38), transparent 42%), linear-gradient(135deg, #020617 0%, #071a4a 38%, #240044 68%, #090018 100%)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <form className="auth-card" noValidate
        onSubmit={
          isRecovery
            ? handleResetPassword
            : handleLogin
        }
        style={{
          width: "100%",
          maxWidth: "420px",
          boxSizing: "border-box",
          padding: "24px",
          borderRadius: "28px",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.78), rgba(235,242,255,0.58))",
          border: "1px solid rgba(255,255,255,0.82)",
          boxShadow:
            "0 24px 70px rgba(15,23,42,0.20), inset 0 1px 0 rgba(255,255,255,0.95)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)"
        }}
      >
        <h2 style={{ marginBottom: "8px" }}>
          SUNIL
        </h2>

        {isRecovery ? (
          <>
            <p style={{ marginBottom: "24px" }}>
              नया password सेट करें
            </p>

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
              required
              minLength={8}
              style={{
                ...glassInputStyle,
                marginBottom: "16px"
              }}
            />

            {error && (
              <div
                role="alert"
                style={{
                  marginBottom: "12px",
                  padding: "11px 14px",
                  borderRadius: "14px",
                  background:
                    "linear-gradient(145deg, rgba(255,245,245,0.82), rgba(255,230,230,0.62))",
                  border: "1px solid rgba(239,68,68,0.28)",
                  color: "#b91c1c",
                  fontSize: "14px",
                  fontWeight: "600",
                  textAlign: "center",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 18px rgba(185,28,28,0.10)",
                  backdropFilter: "blur(18px) saturate(160%)",
                  WebkitBackdropFilter: "blur(18px) saturate(160%)",
                  animation: "authValidationIn 0.25s ease-out both"
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                role="status"
                style={{
                  marginBottom: "12px",
                  padding: "11px 14px",
                  borderRadius: "14px",
                  background:
                    "linear-gradient(145deg, rgba(240,253,244,0.82), rgba(220,252,231,0.62))",
                  border: "1px solid rgba(34,197,94,0.28)",
                  color: "#15803d",
                  fontSize: "14px",
                  fontWeight: "600",
                  textAlign: "center",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 18px rgba(21,128,61,0.10)",
                  backdropFilter: "blur(18px) saturate(160%)",
                  WebkitBackdropFilter: "blur(18px) saturate(160%)",
                  animation: "authValidationIn 0.25s ease-out both"
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="premium-button-press"
              style={{
                ...glassPrimaryButtonStyle,
                cursor: loading
                  ? "not-allowed"
                  : "pointer"
              }}
            >
              {loading
                ? "Updating..."
                : "Update Password"}
            </button>
          </>
        ) : (
          <>
            <p style={{ marginBottom: "24px" }}>
              Login to continue
            </p>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              style={{
                ...glassInputStyle,
                marginBottom: "12px"
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              style={{
                ...glassInputStyle,
                marginBottom: "8px"
              }}
            />

            <div
              style={{
                textAlign: "right",
                marginBottom: "16px"
              }}
            >
              <button
                type="button"
                className="premium-button-press"
                onClick={handleForgotPassword}
                disabled={loading}
                style={{
                  ...glassLinkButtonStyle,
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                Forgot Password?
              </button>
            </div>

            {error && (
              <div className="premium-auth-message premium-auth-error" role="alert">
                <span className="premium-auth-message-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="premium-auth-message premium-auth-success" role="status">
                <span className="premium-auth-message-icon">✓</span>
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={loading ? "premium-auth-submit premium-auth-submit-loading premium-button-press" : "premium-auth-submit premium-button-press"}
            >
              {loading ? (
                <span className="premium-auth-loading-content">
                  <span className="premium-auth-spinner" />
                  <span>Logging in...</span>
                </span>
              ) : (
                "Login"
              )}
            </button>

            {onRegister && (
              <button
                type="button"
                className="premium-button-press"
                onClick={onRegister}
                disabled={loading}
                style={{
                    ...glassSecondaryButtonStyle,
                    marginTop: "10px",
                    cursor: loading ? "not-allowed" : "pointer"
                  }}
              >
                New user? Create account
              </button>
            )}
          </>
        )}
      </form>
    </div>
  );
}

export default Login;
