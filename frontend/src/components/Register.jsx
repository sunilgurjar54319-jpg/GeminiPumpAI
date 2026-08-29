import { useState } from "react";
import { ID } from "appwrite";
import { account } from "../appwrite";

function Register({ onRegistered, onBackToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleRegister(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("नाम डालना जरूरी है।");
      return;
    }

    if (!cleanEmail) {
      setError("Email डालना जरूरी है।");
      return;
    }

    if (password.length < 8) {
      setError("Password कम से कम 8 characters का होना चाहिए।");
      return;
    }

    if (password !== confirmPassword) {
      setError("दोनों passwords match नहीं कर रहे हैं।");
      return;
    }

    setLoading(true);

    try {
      // Register directly with Appwrite.
      await account.create(
        ID.unique(),
        cleanEmail,
        password,
        cleanName
      );

      setMessage("Account created successfully! Please login.");

      setTimeout(() => {
        if (onRegistered) {
          onRegistered(cleanEmail);
        } else if (onBackToLogin) {
          onBackToLogin();
        }
      }, 1200);

    } catch (err) {
      console.error("Registration Error:", err);

      if (err?.code === 409) {
        setError("इस email से account पहले से मौजूद है।");
      } else {
        setError(
          err?.message || "Registration failed"
        );
      }

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
      <form
        className="auth-card"
        noValidate
        onSubmit={handleRegister}
        style={{
          width: "100%",
          maxWidth: "380px",
          padding: "30px",
          borderRadius: "16px",
          background: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)"
        }}
      >
        <h2>SUNIL</h2>

        <p style={{ marginBottom: "24px" }}>
          Create a new account
        </p>

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "12px",
            boxSizing: "border-box"
          }}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
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
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "12px",
            boxSizing: "border-box"
          }}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(e.target.value)
          }
          required
          minLength={8}
          autoComplete="new-password"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "16px",
            boxSizing: "border-box"
          }}
        />

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
          className={loading ? "premium-auth-submit premium-auth-submit-loading" : "premium-auth-submit"}
        >
          {loading ? (
            <span className="premium-auth-loading-content">
              <span className="premium-auth-spinner" />
              <span>Registering...</span>
            </span>
          ) : (
            "Register"
          )}
        </button>

        <button
          type="button"
          onClick={onBackToLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "10px",
            background: "transparent",
            border: "none",
            textDecoration: "none",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          Already have an account? Login
        </button>
      </form>
    </div>
  );
}

export default Register;
