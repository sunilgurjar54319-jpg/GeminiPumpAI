import { useState } from "react";
import { account } from "../appwrite";

function Login({ onLogin }) {
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

  async function handleLogin(e) {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      let user;

      // Check existing Appwrite session first
      try {
        user = await account.get();
        console.log("Existing Appwrite session:", user.$id);
      } catch {
        // No session → create a new email/password session
        await account.createEmailPasswordSession(
          email.trim(),
          password
        );

        user = await account.get();
      }

      // Create fresh JWT for backend authentication
      const jwtResult = await account.createJWT();

      sessionStorage.setItem(
        "geminiPumpJWT",
        jwtResult.jwt
      );

      onLogin(user);

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
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <form
        onSubmit={
          isRecovery
            ? handleResetPassword
            : handleLogin
        }
        style={{
          width: "100%",
          maxWidth: "380px",
          padding: "30px",
          borderRadius: "16px",
          background: "#fff",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.12)"
        }}
      >
        <h2 style={{ marginBottom: "8px" }}>
          Gemini Pump AI
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
                width: "100%",
                padding: "12px",
                marginBottom: "16px",
                boxSizing: "border-box"
              }}
            />

            {error && (
              <p
                style={{
                  color: "red",
                  marginBottom: "12px"
                }}
              >
                {error}
              </p>
            )}

            {message && (
              <p
                style={{
                  color: "green",
                  marginBottom: "12px"
                }}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
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
                width: "100%",
                padding: "12px",
                marginBottom: "12px",
                boxSizing: "border-box"
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
                width: "100%",
                padding: "12px",
                marginBottom: "8px",
                boxSizing: "border-box"
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
                onClick={handleForgotPassword}
                disabled={loading}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
              >
                Forgot Password?
              </button>
            </div>

            {error && (
              <p
                style={{
                  color: "red",
                  marginBottom: "12px"
                }}
              >
                {error}
              </p>
            )}

            {message && (
              <p
                style={{
                  color: "green",
                  marginBottom: "12px"
                }}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                cursor: loading
                  ? "not-allowed"
                  : "pointer"
              }}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default Login;
