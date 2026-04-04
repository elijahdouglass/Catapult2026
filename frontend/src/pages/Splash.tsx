import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { CSSProperties, useEffect } from "react";

const testimonials = [
  {
    quote: "As a Catapult judge I can't comment on any projects.",
    name: "Shrung Patel",
    role: "Catapult Organizer",
    photoUrl: "/assets/shrung.png",
    initials: "SP",
  },
];

export default function Splash() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const styleId = "splash-page-keyframes";

    if (document.getElementById(styleId)) {
      return;
    }

    const styleSheet = document.createElement("style");
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes floatDown {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(100vh) rotate(30deg); opacity: 0; }
      }

      @keyframes testimonialLoop {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `;

    document.head.appendChild(styleSheet);

    return () => {
      styleSheet.remove();
    };
  }, []);

  return (
    <div style={styles.wrapper}>
      {/* Theme toggle — top right */}
			{!user || !user.onboarded ? (
				<button
					style={styles.themeBtn}
					onClick={toggleTheme}
					aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
				>
        {theme === "light" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </button>
			) : null}

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
          Match through<br />
          <span style={styles.headlineAccent}>the reels you love</span>
        </h1>

				<p style={styles.subtitle}>Don’t have enough love in your life? Don’t have enough doomscrolling in your life? Well… <br /><br /><b>Reel Rizz</b> is the solution to both of these problems. You’ll match with other users based on your shared taste in <s>brainrot memes</s> transformative short form video content. Like enough of their reels, (and if they like enough of yours), then soon you’ll be able to scroll together, forever.</p>
					{/* <p style={styles.subtitle}>
           We read your Instagram interests, find people with similar taste
           using AI, then let you vibe-check each other's reels.
           Like enough of theirs, they like enough of yours &mdash; it's a match.
         </p> */}
        <div style={styles.ctas}>
          <button
            className="btn btn-primary"
            style={{ padding: "14px 36px", fontSize: "1rem" }}
            onClick={() => navigate("/auth?mode=register")}
          >
            Get started
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/auth?mode=login")}
          >
            I have an account
          </button>
        </div>

				{/*<section style={styles.testimonialSection}>
          <div style={styles.testimonialViewport}>
            <div style={styles.testimonialTrack}>
              {[...testimonials, ...testimonials].map((testimonial, index) => (
                <article
                  key={`${testimonial.name}-${index}`}
                  style={styles.testimonialCard}
                >
                  <div
                    style={{
                      ...styles.testimonialPhoto,
                      backgroundImage: testimonial.photoUrl
                        ? `linear-gradient(135deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.28)), url(${testimonial.photoUrl})`
                        : styles.testimonialPhoto.backgroundImage,
                    }}
                    aria-hidden="true"
                  >
                    <span style={styles.testimonialPhotoInitials}>
                      {testimonial.initials}
                    </span>
                  </div>

                  <div style={styles.testimonialContent}>
                    <blockquote style={styles.testimonialText}>
                      "{testimonial.quote}"
                    </blockquote>
                    <cite style={styles.testimonialAuthor}>
                      <strong>{testimonial.name}</strong>
                      <span style={styles.testimonialRole}>{testimonial.role}</span>
                    </cite>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>*/}

      </div>


      {/* How it works */}
      <div style={styles.steps}>
        <h2 style={styles.stepsTitle}>how it works</h2>
        <div style={styles.stepsGrid}>
          {[
            {
              num: "01",
              icon: "\uD83D\uDCF8",
              title: "Screenshot your Explore",
              desc: "Upload a screenshot of your Instagram Explore word bubbles. Our OCR extracts the interest tags that define your taste.",
            },
            {
              num: "02",
              icon: "\uD83E\udDE0",
              title: "AI builds your vibe vector",
              desc: "Each tag is turned into a semantic embedding. We average them into a single vector that captures your interests.",
            },
            {
              num: "03",
              icon: "\uD83C\uDFAF",
              title: "Cosine similarity ranking",
              desc: "We compare your vector against everyone else's. The closer the angle, the higher your compatibility score.",
            },
            {
              num: "04",
              icon: "\uD83C\uDFAC",
              title: "Scroll their reels",
              desc: "Browse matched users' latest Instagram reels in a TikTok-style feed. Our browser extension tracks which reels each user watches.",
            },
            {
              num: "05",
              icon: "\u2764\uFE0F",
              title: "Like 3 reels = like the person",
              desc: "Heart the reels that hit. Once you've liked enough from one person (default 3), you automatically \"like\" them.",
            },
            {
              num: "06",
              icon: "\uD83D\uDD13",
              title: "Mutual match = IG reveal",
              desc: "When both people like each other through reels, you unlock each other's Instagram username. Real connection starts.",
            },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                ...styles.stepCard,
                animationDelay: `${0.2 + i * 0.1}s`,
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

      {/* Tech callout */}
      <div style={styles.techSection}>
        <h2 style={styles.techTitle}>under the hood</h2>
        <div style={styles.techGrid}>
          {[
            { label: "OCR", detail: "Tesseract via flood-fill bubble detection" },
            { label: "Embeddings", detail: "sentence-transformers all-MiniLM-L6-v2" },
            { label: "Matching", detail: "Cosine similarity on mean tag vectors" },
            { label: "Reel tracking", detail: "Chrome extension with History API hooks" },
          ].map((t, i) => (
            <div key={i} style={styles.techChip}>
              <span style={styles.techLabel}>{t.label}</span>
              <span style={styles.techDetail}>{t.detail}</span>
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
  themeBtn: {
    position: "absolute",
    top: 18,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: "var(--radius-full)",
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.25s ease",
    padding: 0,
    zIndex: 10,
    backdropFilter: "blur(12px)",
    boxShadow: "var(--shadow-sm)",
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
    fontSize: "1.05rem",
    color: "var(--text-secondary)",
    lineHeight: 1.65,
    maxWidth: 480,
    marginBottom: 32,
  },
  ctas: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  testimonialSection: {
    width: "100%",
    maxWidth: 760,
    marginBottom: 32,
  },
  testimonialViewport: {
    overflow: "hidden",
    width: "100%",
    maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
    WebkitMaskImage:
      "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
  },
  testimonialTrack: {
    display: "flex",
    gap: 16,
    width: "max-content",
    animation: "testimonialLoop 24s linear infinite",
  },
  testimonialCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "var(--surface-glass)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: "18px",
    backdropFilter: "blur(14px)",
    boxShadow: "var(--shadow-sm)",
    width: 340,
    flex: "0 0 340px",
  },
  testimonialPhoto: {
    width: 88,
    height: 88,
    borderRadius: "24px",
    flexShrink: 0,
    background:
      "linear-gradient(135deg, rgba(232, 67, 111, 0.9), rgba(255, 122, 89, 0.85))",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    overflow: "hidden",
    position: "relative",
  },
  testimonialPhotoInitials: {
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.92)",
    padding: "0 0 10px 10px",
    textShadow: "0 1px 8px rgba(0,0,0,0.32)",
  },
  testimonialContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    textAlign: "left",
  },
  testimonialText: {
    margin: 0,
    fontSize: "0.96rem",
    lineHeight: 1.6,
    color: "var(--text-primary)",
  },
  testimonialAuthor: {
    display: "flex",
    flexDirection: "column",
    marginTop: 14,
    fontStyle: "normal",
    color: "var(--text-secondary)",
    gap: 2,
  },
  testimonialRole: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
  },
  steps: {
    width: "100%",
    maxWidth: 960,
    padding: "40px 24px 48px",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px",
  },
  stepCard: {
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: "24px 22px",
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
    marginBottom: 6,
  },
  stepIcon: {
    fontSize: "1.8rem",
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    lineHeight: 1.55,
  },
  techSection: {
    width: "100%",
    maxWidth: 700,
    padding: "0 24px 48px",
    animation: "fadeInUp 0.8s var(--ease-out-expo) 0.5s both",
  },
  techTitle: {
    textAlign: "center" as const,
    fontSize: "0.85rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "var(--text-muted)",
    marginBottom: 20,
  },
  techGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "10px",
  },
  techChip: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 18px",
    borderRadius: "var(--radius-md)",
    background: "var(--surface-glass)",
    border: "1px solid var(--border-subtle)",
    backdropFilter: "blur(12px)",
  },
  techLabel: {
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "var(--rose-500)",
    flexShrink: 0,
    minWidth: 90,
  },
  techDetail: {
    fontSize: "0.84rem",
    color: "var(--text-secondary)",
    lineHeight: 1.4,
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
