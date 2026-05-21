import { CSSProperties, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SignIn, SignUp, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "register";

// Clerk-hosted sign-in / sign-up UI. The verify-IG step still belongs to us
// (it's an app-specific check, not an identity check), so it lives at
// /onboarding/verify behind a SignedIn gate.
export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode: Mode = searchParams.get("mode") === "register" ? "register" : "login";
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Once Clerk authenticates and our /me sync finishes, route the user to
  // the right next step.
  useEffect(() => {
    if (loading || !user) return;
    if (user.igVerified === false) {
      navigate("/onboarding/verify", { replace: true });
    } else if (!user.onboarded) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/discover", { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div style={styles.wrapper}>
      <SignedOut>
        <div style={styles.clerkBox}>
          {mode === "register" ? (
            <SignUp
              routing="virtual"
              signInUrl="/auth?mode=login"
              afterSignUpUrl="/auth"
              afterSignInUrl="/auth"
            />
          ) : (
            <SignIn
              routing="virtual"
              signUpUrl="/auth?mode=register"
              afterSignInUrl="/auth"
              afterSignUpUrl="/auth"
            />
          )}
        </div>
      </SignedOut>
      <SignedIn>
        <div style={styles.loading}>
          <span className="spinner" style={{ width: 24, height: 24 }} />
          <p style={{ marginTop: 12, color: "var(--text-muted)" }}>
            Signing you in&hellip;
          </p>
        </div>
      </SignedIn>
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
  clerkBox: {
    width: "100%",
    maxWidth: 420,
    display: "flex",
    justifyContent: "center",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
};
