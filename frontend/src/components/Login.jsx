import { useState } from "react";
import { account } from "../appwrite";
import { startAuthentication } from "@simplewebauthn/browser";

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

  async function handleLogin(e) {
    e.preventDefault();

    setError("");
    setMessage("");
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


  async function handleBiometricLogin() {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (!window.isSecureContext) {
        throw new Error(
          "Biometric Login ke liye secure HTTPS connection required hai."
        );
      }

      if (!window.PublicKeyCredential) {
        throw new Error(
          "Is device/browser me biometric authentication supported nahi hai."
        );
      }

      const available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

      if (!available) {
        throw new Error(
          "Is device me fingerprint/face biometric available nahi hai."
        );
      }

      const optionsResponse = await fetch(
        "/api/biometric/login/options",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      const optionsData = await optionsResponse.json();

      if (!optionsResponse.ok || !optionsData.success) {
        throw new Error(
          optionsData.error ||
          "Biometric login options failed."
        );
      }

      const authenticationResponse =
        await startAuthentication({
          optionsJSON: optionsData.options
        });

      const verifyResponse = await fetch(
        "/api/biometric/login/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(authenticationResponse)
        }
      );

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.success) {
        throw new Error(
          verifyData.error ||
          "Biometric authentication failed."
        );
      }

      if (!verifyData.jwt) {
        throw new Error(
          "Biometric login succeeded but backend JWT was not returned."
        );
      }

      sessionStorage.setItem(
        "geminiPumpJWT",
        verifyData.jwt
      );

      // Restore the Appwrite browser session using the
      // authenticated user's JWT.
      const jwtClientModule = await import("appwrite");

      const jwtClient =
        new jwtClientModule.Client()
          .setEndpoint("https://cloud.appwrite.io/v1")
          .setProject("6a6abdb7002586cbab5b5")
          .setJWT(verifyData.jwt);

      const jwtAccount =
        new jwtClientModule.Account(jwtClient);

      const user = await jwtAccount.get();

      onLogin(user);

    } catch (err) {
      console.error(
        "Biometric Login Error:",
        err
      );

      if (
        err?.name === "NotAllowedError" ||
        err?.name === "AbortError"
      ) {
        setError(
          "Biometric login cancel कर दिया गया।"
        );
      } else {
        setError(
          err?.message ||
          "Biometric login failed."
        );
      }

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
    <div className="auth-screen"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <form className="auth-card"
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

            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "10px",
                cursor: loading
                  ? "not-allowed"
                  : "pointer"
              }}
            >
              {loading
                ? "Please wait..."
                : "🔐 Login with Biometric"}
            </button>

            {onRegister && (
              <button
                type="button"
                onClick={onRegister}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "10px",
                  background: "transparent",
                  border: "none",
                  textDecoration: "underline",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer"
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
