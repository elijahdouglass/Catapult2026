import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

// IG verification gate. Clerk has already authenticated the user; this is the
// app's own check that the IG username they claim is theirs (they DM a code
// to our handle, the webhook flips the flag, we poll until it does).
export default function VerifyIg() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [igInput, setIgInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const saveIgUsername = async (e: FormEvent) => {
    e.preventDefault();
    if (!igInput.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.patch("/auth/profile", { igUsername: igInput.trim() });
      await refreshUser();
    } catch (err: any) {
      setError(err.message || "Could not save IG handle");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (loading || !user) return;
    if (user.igVerified) return; // effect below will navigate away

    pollRef.current = setInterval(async () => {
      try {
        const data = await api.get<{ igVerified: boolean }>(
          "/auth/verify-status"
        );
        if (data.igVerified) {
          clearInterval(pollRef.current);
          await refreshUser();
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [loading, user, refreshUser]);

  useEffect(() => {
    if (loading || !user) return;
    if (user.igVerified) {
      navigate(user.onboarded ? "/discover" : "/onboarding", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const hasIgUsername = !!user.igUsername;

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.logoRow}>
          <img src="/assets/logo.webp" alt="Reel Rizz" style={styles.logo} />
        </div>
        <h1 style={styles.title}>Verify your Instagram</h1>

        {!hasIgUsername ? (
          <form onSubmit={saveIgUsername}>
            <p style={styles.subtitle}>
              First, what Instagram handle should we link to your account?
            </p>
            {error && <p style={{ color: "var(--coral)", fontSize: "0.85rem" }}>{error}</p>}
            <input
              className="input"
              placeholder="your_username"
              value={igInput}
              onChange={(e) => setIgInput(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              required
              style={{ marginBottom: 12 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={saving || !igInput.trim()}
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          </form>
        ) : (
          <>
            <p style={styles.subtitle}>
              DM this code to{" "}
              <strong style={{ color: "var(--text-primary)" }}>@reel.rizz_</strong>{" "}
              from <strong>@{user.igUsername}</strong>
            </p>
            <div style={styles.codeBox}>{user.igVerifyCode ?? "loading…"}</div>
            <p style={styles.waitingText}>
              <span
                className="spinner"
                style={{ width: 16, height: 16, display: "inline-block" }}
              />{" "}
              Waiting for verification...
            </p>
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
    textAlign: "center" as const,
  },
  logoRow: { display: "flex", justifyContent: "center", marginBottom: 20 },
  logo: { width: 64, height: 64, objectFit: "contain" as const },
  title: {
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "var(--text-muted)",
    marginBottom: 24,
  },
  codeBox: {
    fontSize: "2rem",
    fontWeight: 800,
    fontFamily: "monospace",
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
};
