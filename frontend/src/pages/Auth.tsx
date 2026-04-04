import { useState, useEffect, useRef, CSSProperties, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

type View = "login" | "register" | "verify";

export default function Auth() {
  const [view, setView] = useState<View>("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Register fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [igUsername, setIgUsername] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  // Login fields
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const { login, register, refreshUser } = useAuth();
  const navigate = useNavigate();
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Poll for IG verification
  useEffect(() => {
    if (view !== "verify") return;

    pollRef.current = setInterval(async () => {
      try {
        const data = await api.get<{ igVerified: boolean }>("/auth/verify-status");
        if (data.igVerified) {
          clearInterval(pollRef.current);
          await refreshUser();
          navigate("/onboarding");
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [view, navigate, refreshUser]);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { verifyCode: code } = await register(
        email,
        password,
        displayName,
        igUsername
      );
      setVerifyCode(code);
      setView("verify");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(loginUsername, loginPassword);
      navigate("/discover");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── Verification screen ──
  if (view === "verify") {
    return (
      <div style={styles.wrapper}>
        <div style={styles.container}>
          <div style={styles.logoRow}>
            <img src="/assets/logo.webp" alt="Reel Rizz" style={styles.logo} />
          </div>

          <h1 style={styles.title}>Verify your Instagram</h1>
          <p style={styles.subtitle}>
            DM this code to{" "}
            <strong style={{ color: "var(--text-primary)" }}>@reel.rizz_</strong>{" "}
            on Instagram
          </p>

          <div style={styles.codeBox}>{verifyCode}</div>

          <p style={styles.waitingText}>
            <span
              className="spinner"
              style={{ width: 16, height: 16, display: "inline-block" }}
            />{" "}
            Waiting for verification...
          </p>
        </div>
      </div>
    );
  }

  // ── Main auth screen ──
  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.logoRow}>
          <img src="/assets/logo.webp" alt="Reel Rizz" style={styles.logo} />
        </div>

        <h1 style={styles.title}>
          {view === "login" ? "Welcome back" : "Join the vibe"}
        </h1>
        <p style={styles.subtitle}>
          {view === "login"
            ? "Sign in to find your match"
            : "Create your account and verify your Instagram"}
        </p>

        {/* Mode toggle */}
        <div style={styles.toggle}>
          <button
            style={{
              ...styles.toggleBtn,
              ...(view === "login" ? styles.toggleBtnActive : {}),
            }}
            onClick={() => { setView("login"); setError(""); }}
          >
            Sign in
          </button>
          <button
            style={{
              ...styles.toggleBtn,
              ...(view === "register" ? styles.toggleBtnActive : {}),
            }}
            onClick={() => { setView("register"); setError(""); }}
          >
            Register
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {view === "login" && (
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email, display name, or IG username</label>
              <input
                className="input"
                type="text"
                placeholder="you@example.com"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                className="input"
                type="password"
                placeholder="Your password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" style={{ width: 20, height: 20 }} />
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        )}

        {view === "register" && (
          <form onSubmit={handleRegister} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Display name</label>
              <input
                className="input"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Instagram username</label>
              <input
                className="input"
                type="text"
                placeholder="your_username"
                value={igUsername}
                onChange={(e) => setIgUsername(e.target.value)}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                className="input"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" style={{ width: 20, height: 20 }} />
              ) : (
                "Create account"
              )}
            </button>
          </form>
        )}

        <p style={styles.switchText}>
          {view === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            style={styles.switchBtn}
            onClick={() => { setView(view === "login" ? "register" : "login"); setError(""); }}
          >
            {view === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  container: {
    width: "100%",
    maxWidth: 420,
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-xl)",
    padding: "40px 36px",
    backdropFilter: "blur(24px)",
    boxShadow: "var(--shadow-lg)",
    animation: "scaleIn 0.5s var(--ease-out-expo) both",
  },
  logoRow: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 20,
  },
  logo: {
    width: 64,
    height: 64,
    objectFit: "contain" as const,
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: 700,
    textAlign: "center" as const,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "var(--text-muted)",
    textAlign: "center" as const,
    marginBottom: 24,
  },
  toggle: {
    display: "flex",
    background: "rgba(232, 67, 111, 0.06)",
    borderRadius: "var(--radius-full)",
    padding: 3,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: "var(--radius-full)",
    border: "none",
    background: "transparent",
    fontFamily: "var(--font-body)",
    fontSize: "0.88rem",
    fontWeight: 500,
    color: "var(--text-muted)",
    cursor: "pointer",
    transition: "all 0.25s ease",
  },
  toggleBtnActive: {
    background: "white",
    color: "var(--rose-600)",
    fontWeight: 600,
    boxShadow: "var(--shadow-sm)",
  },
  error: {
    fontSize: "0.85rem",
    color: "var(--coral)",
    background: "rgba(255, 107, 107, 0.08)",
    border: "1px solid rgba(255, 107, 107, 0.2)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 14px",
    textAlign: "center" as const,
    marginBottom: 16,
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  label: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    paddingLeft: 2,
  },
  codeBox: {
    fontSize: "2rem",
    fontWeight: 800,
    fontFamily: "monospace",
    textAlign: "center" as const,
    letterSpacing: "0.3em",
    color: "var(--rose-500)",
    background: "rgba(232, 67, 111, 0.06)",
    border: "2px dashed var(--rose-300)",
    borderRadius: "var(--radius-lg)",
    padding: "20px",
    marginBottom: 20,
    userSelect: "all" as const,
  },
  waitingText: {
    fontSize: "0.9rem",
    color: "var(--text-muted)",
    textAlign: "center" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  switchText: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    textAlign: "center" as const,
    marginTop: 20,
  },
  switchBtn: {
    background: "none",
    border: "none",
    color: "var(--rose-500)",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    fontSize: "0.85rem",
  },
};
