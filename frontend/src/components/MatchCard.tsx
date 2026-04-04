import { CSSProperties, useState } from "react";

interface MatchCardProps {
  displayName: string;
  tags: string;
  similarityScore: number;
  onLike: () => void;
  liked: boolean;
}

export default function MatchCard({
  displayName,
  tags,
  similarityScore,
  onLike,
  liked,
}: MatchCardProps) {
  const [animating, setAnimating] = useState(false);
  const allTags = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const tagList = allTags.slice(0, 6);
  const remainingCount = allTags.length - 6;

  const handleLike = () => {
    if (liked) return;
    setAnimating(true);
    onLike();
    setTimeout(() => setAnimating(false), 600);
  };

  const scoreColor =
    similarityScore >= 80
      ? "var(--hot-pink)"
      : similarityScore >= 60
      ? "var(--rose-500)"
      : "var(--rose-400)";

  return (
    <div style={styles.card}>
      {/* Avatar placeholder with initial */}
      <div style={styles.avatarRow}>
        <div style={styles.avatar}>
          <span style={styles.avatarLetter}>
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div style={styles.info}>
          <h3 style={styles.name}>{displayName}</h3>
          <div style={{ ...styles.score, color: scoreColor }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {similarityScore}% match
          </div>
        </div>
        <button
          onClick={handleLike}
          disabled={liked}
          style={{
            ...styles.heartBtn,
            ...(liked ? styles.heartBtnLiked : {}),
            ...(animating ? styles.heartBtnAnimate : {}),
          }}
          aria-label={liked ? "Liked" : "Like"}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Tags */}
      <div style={styles.tags}>
        {tagList.map((tag, i) => (
          <span key={i} className="tag-pill">
            {tag}
          </span>
        ))}
        {remainingCount > 0 && (
          <span style={styles.moreTag}>+{remainingCount}</span>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: "22px 24px",
    backdropFilter: "blur(20px)",
    boxShadow: "var(--shadow-sm)",
    transition: "all 0.35s var(--ease-out-expo)",
    animation: "fadeInUp 0.5s var(--ease-out-expo) both",
  },
  avatarRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "14px",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: "var(--radius-full)",
    background: "linear-gradient(135deg, var(--rose-300), var(--lavender))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarLetter: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "white",
    textShadow: "0 1px 2px rgba(0,0,0,0.1)",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: "1.05rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1.3,
  },
  score: {
    fontSize: "0.82rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "5px",
    marginTop: "2px",
  },
  heartBtn: {
    width: 44,
    height: 44,
    borderRadius: "var(--radius-full)",
    border: "1.5px solid var(--border-accent)",
    background: "transparent",
    color: "var(--rose-400)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s var(--ease-out-expo)",
    flexShrink: 0,
  },
  heartBtnLiked: {
    background: "linear-gradient(135deg, var(--rose-500), var(--hot-pink))",
    color: "white",
    border: "1.5px solid transparent",
    boxShadow: "var(--shadow-md)",
  },
  heartBtnAnimate: {
    animation: "heartPulse 0.6s var(--ease-spring)",
  },
  tags: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
  },
  moreTag: {
    padding: "4px 10px",
    borderRadius: "var(--radius-full)",
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "var(--text-muted)",
    background: "rgba(232, 67, 111, 0.05)",
  },
};
