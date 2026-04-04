import { useState, useEffect, CSSProperties } from "react";
import { api } from "../api/client";
import MatchCard from "../components/MatchCard";

interface Candidate {
  userId: number;
  displayName: string;
  tags: string;
  similarityScore: number;
}

export default function Discover() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Candidate[]>("/discover")
      .then(setCandidates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLike = async (userId: number, name: string) => {
    setLikedIds((prev) => new Set(prev).add(userId));
    try {
      const data = await api.post<{ liked: boolean; mutual: boolean }>(
        "/discover/like",
        { likeeId: userId }
      );
      if (data.mutual) {
        showToast(`It's a match with ${name}! Check your matches`);
      }
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

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
        <h1 style={styles.title}>Discover</h1>
        <p style={styles.subtitle}>
          People who match your vibe, ranked by compatibility
        </p>
      </div>

      {candidates.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>&#x1F331;</div>
          <h3 style={styles.emptyTitle}>No more people to discover</h3>
          <p style={styles.emptyDesc}>
            Check back later — new people join every day
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {candidates.map((c, i) => (
            <div key={c.userId} style={{ animationDelay: `${i * 0.06}s` }}>
              <MatchCard
                displayName={c.displayName}
                tags={c.tags}
                similarityScore={c.similarityScore}
                liked={likedIds.has(c.userId)}
                onLike={() => handleLike(c.userId, c.displayName)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Toast notification */}
      <div className={`toast ${toast ? "visible" : ""}`}>
        &#x1F496; {toast}
      </div>
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "16px",
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
  },
};
