import { useState, CSSProperties, FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001/api";
const DEV_AUTH = import.meta.env.VITE_DEV_AUTH === "true";

export default function Auth() {
  const [params] = useSearchParams();
  const oauthError = params.get("error");

  // Dev auth state
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(oauthError ? `Login failed: ${oauthError}` : "");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleInstagramLogin = () => {
    window.location.href = `${API_BASE}/auth/instagram`;
  };

  const handleDevSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
        navigate("/discover");
      } else {
        await register(email, password, displayName);
        navigate("/onboarding");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.logoRow}>
          <img src="/assets/logo.webp" alt="Reel Rizz" style={styles.logo} />
        </div>

        <h1 style={styles.title}>Welcome to Reel Rizz</h1>
        <p style={styles.subtitle}>
          Sign in with your Instagram professional account to start matching
        </p>

        {error && <p style={styles.error}>{error}</p>}

        <button
          className="btn btn-primary"
          style={styles.igButton}
          onClick={handleInstagramLogin}
        >
          Continue with Instagram
        </button>

        {DEV_AUTH && (
          <>
            <div style={styles.divider}>
              <span style={styles.dividerLine} />
              <span style={styles.dividerText}>DEV</span>
              <span style={styles.dividerLine} />
            </div>

            <div style={styles.toggle}>
              <button
                style={{
                  ...styles.toggleBtn,
                  ...(mode === "login" ? styles.toggleBtnActive : {}),
                }}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Sign in
              </button>
              <button
                style={{
                  ...styles.toggleBtn,
                  ...(mode === "register" ? styles.toggleBtnActive : {}),
                }}
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleDevSubmit} style={styles.form}>
              {mode === "register" && (
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
              )}

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
                  <span
                    className="spinner"
                    style={{ width: 20, height: 20 }}
                  />
                ) : mode === "login" ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </button>
            </form>
          </>
        )}
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
  igButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontSize: "1rem",
    fontWeight: 600,
    padding: "14px 20px",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "24px 0",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "var(--border-subtle)",
  },
  dividerText: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    letterSpacing: "0.1em",
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
};
