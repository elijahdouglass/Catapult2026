import { useState, useEffect, CSSProperties } from "react";
import { api } from "../api/client";

interface Match {
  userId: number;
  displayName: string;
  igUsername: string;
  tags: string;
  similarityScore: number;
}

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Match[]>("/matches")
      .then(setMatches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <div style={styles.header}>
        <h1 style={styles.title}>Your Matches</h1>
        <p style={styles.subtitle}>
          Mutual vibes — connect on Instagram
        </p>
      </div>

      {matches.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>&#x1F49D;</div>
          <h3 style={styles.emptyTitle}>No matches yet</h3>
          <p style={styles.emptyDesc}>
            Keep liking people on Discover — when someone likes you back, they'll
            show up here
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {matches.map((m, i) => (
            <div
              key={m.userId}
              style={{
                ...styles.card,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div style={styles.cardLeft}>
                <div style={styles.avatar}>
                  <span style={styles.avatarLetter}>
                    {m.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div style={styles.info}>
                  <h3 style={styles.name}>{m.displayName}</h3>
                  <div style={styles.score}>
                    {m.similarityScore}% match
                  </div>
                  <div style={styles.tags}>
                    {m.tags
                      .split(",")
                      .slice(0, 4)
                      .map((tag, j) => (
                        <span key={j} className="tag-pill">
                          {tag.trim()}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              <a
                href={`https://instagram.com/${m.igUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.igLink}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                @{m.igUsername}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    marginBottom: 28,
    animation: "fadeInUp 0.5s var(--ease-out-expo) both",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "var(--text-muted)",
    marginTop: 4,
  },
  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  card: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: "20px 24px",
    backdropFilter: "blur(20px)",
    boxShadow: "var(--shadow-sm)",
    animation: "fadeInUp 0.5s var(--ease-out-expo) both",
    flexWrap: "wrap" as const,
  },
  cardLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: "var(--radius-full)",
    background: "linear-gradient(135deg, var(--rose-400), var(--hot-pink))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarLetter: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "white",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: "1.05rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  score: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--rose-500)",
    marginTop: 2,
  },
  tags: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "4px",
    marginTop: 6,
  },
  igLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    borderRadius: "var(--radius-full)",
    background: "linear-gradient(135deg, var(--rose-500), var(--hot-pink))",
    color: "white",
    textDecoration: "none",
    fontSize: "0.88rem",
    fontWeight: 600,
    transition: "all 0.3s var(--ease-out-expo)",
    flexShrink: 0,
    boxShadow: "var(--shadow-md)",
  },
  empty: {
    textAlign: "center" as const,
    padding: "80px 20px",
    animation: "fadeIn 0.6s var(--ease-out-expo) both",
  },
  emptyIcon: {
    fontSize: "3rem",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: "1.15rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: "0.9rem",
    color: "var(--text-muted)",
    maxWidth: 380,
    margin: "0 auto",
    lineHeight: 1.5,
  },
};
