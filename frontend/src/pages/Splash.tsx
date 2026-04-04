import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CSSProperties, useEffect } from "react";

export default function Splash() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate(user.onboarded ? "/discover" : "/onboarding", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div style={styles.wrapper}>
      {/* Floating decorative hearts */}
      <div style={styles.heartsContainer} aria-hidden="true">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.floatingHeart,
              left: `${15 + i * 14}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${3 + (i % 3)}s`,
              fontSize: `${14 + (i % 3) * 8}px`,
              opacity: 0.12 + (i % 3) * 0.05,
            }}
          >
            &#x2764;
          </div>
        ))}
      </div>

      <div style={styles.hero}>
        <img
          src="/assets/logo.webp"
          alt="Reel Rizz"
          style={styles.logo}
        />

        <h1 style={styles.headline}>
          Your feed knows<br />
          <span style={styles.headlineAccent}>your type</span>
        </h1>

        <p style={styles.subtitle}>
          Upload your Instagram feed words. We match you with people who
          actually get your vibe. No cap.
        </p>

        <div style={styles.ctas}>
          <button
            className="btn btn-primary"
            style={{ padding: "14px 36px", fontSize: "1rem" }}
            onClick={() => navigate("/auth")}
          >
            Get started
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/auth")}
          >
            I have an account
          </button>
        </div>
      </div>

      {/* How it works */}
      <div style={styles.steps}>
        <h2 style={styles.stepsTitle}>how it works</h2>
        <div style={styles.stepsGrid}>
          {[
            {
              num: "01",
              icon: "📸",
              title: "Screenshot",
              desc: "Snap your Instagram Explore feed word bubbles",
            },
            {
              num: "02",
              icon: "🧠",
              title: "Match",
              desc: "Our AI reads your vibes and finds your people",
            },
            {
              num: "03",
              icon: "💬",
              title: "Connect",
              desc: "Mutual likes unlock each other's Instagram",
            },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                ...styles.stepCard,
                animationDelay: `${0.2 + i * 0.15}s`,
              }}
            >
              <div style={styles.stepNum}>{step.num}</div>
              <div style={styles.stepIcon}>{step.icon}</div>
              <h3 style={styles.stepTitle}>{step.title}</h3>
              <p style={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer tagline */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          made for the chronically online &hearts; with love
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  heartsContainer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    overflow: "hidden",
  },
  floatingHeart: {
    position: "absolute",
    top: "-30px",
    color: "var(--rose-400)",
    animation: "floatDown 4s ease-in-out infinite",
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "80px 24px 40px",
    maxWidth: 600,
    animation: "fadeInUp 0.8s var(--ease-out-expo) both",
  },
  logo: {
    width: 120,
    height: 120,
    objectFit: "contain" as const,
    marginBottom: 24,
    filter: "drop-shadow(0 8px 24px rgba(232, 67, 111, 0.25))",
    animation: "float 3s ease-in-out infinite",
  },
  headline: {
    fontSize: "clamp(2.2rem, 6vw, 3.2rem)",
    fontWeight: 700,
    lineHeight: 1.15,
    color: "var(--text-primary)",
    letterSpacing: "-0.03em",
    marginBottom: 16,
  },
  headlineAccent: {
    background: "linear-gradient(135deg, var(--rose-500), var(--hot-pink), var(--coral))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    maxWidth: 440,
    marginBottom: 32,
  },
  ctas: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  steps: {
    width: "100%",
    maxWidth: 900,
    padding: "40px 24px 60px",
    animation: "fadeInUp 0.8s var(--ease-out-expo) 0.3s both",
  },
  stepsTitle: {
    textAlign: "center" as const,
    fontSize: "0.85rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "var(--text-muted)",
    marginBottom: 28,
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  stepCard: {
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: "28px 24px",
    textAlign: "center" as const,
    backdropFilter: "blur(20px)",
    animation: "fadeInUp 0.6s var(--ease-out-expo) both",
    transition: "transform 0.3s var(--ease-out-expo), box-shadow 0.3s ease",
  },
  stepNum: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "var(--rose-400)",
    letterSpacing: "0.1em",
    marginBottom: 8,
  },
  stepIcon: {
    fontSize: "2rem",
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: "1.05rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: "0.88rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  footer: {
    padding: "24px",
    textAlign: "center" as const,
  },
  footerText: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    fontWeight: 400,
  },
};

// Inject the floatDown keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes floatDown {
    0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(100vh) rotate(30deg); opacity: 0; }
  }
`;
document.head.appendChild(styleSheet);
