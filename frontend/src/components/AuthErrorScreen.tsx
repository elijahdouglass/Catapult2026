import { CSSProperties } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { AuthError } from "../context/AuthContext";

// Full-screen takeover for permanent /auth/me failures. Today this only
// renders for `email_conflict`, where the user is signed in to Clerk but
// their email already belongs to another local row — every authenticated
// call returns the same 409, so the only useful action is signing out (or
// contacting support).
export default function AuthErrorScreen({ error }: { error: AuthError }) {
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const title =
    error.code === "email_conflict"
      ? "Account conflict"
      : "Something went wrong";

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.logoRow}>
          <img src="/assets/logo.webp" alt="Reel Rizz" style={styles.logo} />
        </div>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.body}>{error.message}</p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 16 }}
          onClick={handleSignOut}
        >
          Sign out
        </button>
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
    marginBottom: 12,
  },
  body: {
    fontSize: "0.95rem",
    color: "var(--text-muted)",
    lineHeight: 1.5,
  },
};
