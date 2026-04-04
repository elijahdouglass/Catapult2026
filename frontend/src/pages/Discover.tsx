import {
  useState,
  useEffect,
  useRef,
  useCallback,
  CSSProperties,
  memo,
} from "react";
import { api } from "../api/client";

/* ── types ─────────────────────────────────────────────── */

interface FeedPerson {
  userId: number;
  displayName: string;
  igUsername: string | null;
  tags: string | null;
  similarityScore: number;
  reels: string[];
}

interface FeedResponse {
  feed: FeedPerson[];
  likedReelIds: string[];
  likeThreshold: number;
}

interface ReelLikeResponse {
  likeCount: number;
  threshold: number;
  personLiked: boolean;
  mutual: boolean;
  matchInfo: { displayName: string; igUsername: string } | null;
}

interface VideoResponse {
  status: string;
  data: { videoUrl: string };
}

type FeedItem =
  | { kind: "intro"; person: FeedPerson }
  | { kind: "reel"; person: FeedPerson; reelId: string; index: number };

/* ── inject keyframe animations once ───────────────────── */

const STYLE_ID = "discover-reel-styles";
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes dr-heartBurst {
      0%   { transform: scale(1); }
      15%  { transform: scale(1.45); }
      30%  { transform: scale(0.95); }
      45%  { transform: scale(1.15); }
      60%  { transform: scale(1); }
      100% { transform: scale(1); }
    }
    @keyframes dr-shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    @keyframes dr-fadeUp {
      from { opacity: 0; transform: translateY(32px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes dr-pulse {
      0%, 100% { opacity: .6; }
      50%      { opacity: 1; }
    }
    @keyframes dr-matchIn {
      0%   { opacity: 0; transform: scale(.8) translateY(40px); }
      60%  { transform: scale(1.03) translateY(-4px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes dr-heartFloat {
      0%   { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
      100% { opacity: 0; transform: translateY(-220px) scale(.4) rotate(25deg); }
    }
    @keyframes dr-chevronBounce {
      0%, 100% { transform: translateY(0); opacity: .7; }
      50%      { transform: translateY(6px); opacity: 1; }
    }
    @keyframes dr-gradientShift {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes dr-ringPulse {
      0%   { transform: scale(1); opacity: .5; }
      100% { transform: scale(2.5); opacity: 0; }
    }
    @keyframes dr-particleDrift {
      0%   { opacity: 0; transform: translate(0, 0) scale(0); }
      20%  { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0); }
    }

    .dr-scroll-container::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(style);
}

/* ── constants ─────────────────────────────────────────── */

const NAV_H = 60;
/* ── video cache ───────────────────────────────────────── */

const videoUrlCache = new Map<string, string>();

async function fetchVideoUrl(reelId: string): Promise<string | null> {
  if (videoUrlCache.has(reelId)) return videoUrlCache.get(reelId)!;
  try {
    const json = await api.get<VideoResponse>(
      `/video?postUrl=${encodeURIComponent(
        `https://www.instagram.com/reel/${reelId}/`
      )}`
    );
    if (json.status === "success" && json.data?.videoUrl) {
      videoUrlCache.set(reelId, json.data.videoUrl);
      return json.data.videoUrl;
    }
  } catch {
    /* swallow */
  }
  return null;
}

/* ── sub-components ────────────────────────────────────── */

/** Single reel slide */
const ReelSlide = memo(function ReelSlide({
  item,
  liked,
  likeCountForPerson,
  threshold,
  onLike,
  onUnlike,
}: {
  item: FeedItem & { kind: "reel" };
  liked: boolean;
  likeCountForPerson: number;
  threshold: number;
  onLike: (reelId: string, ownerId: number) => void;
  onUnlike: (reelId: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bursting, setBursting] = useState(false);
  const [particles, setParticles] = useState<
    { id: number; dx: string; dy: string; delay: string; size: number }[]
  >([]);

  // fetch video url
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchVideoUrl(item.reelId).then((url) => {
      if (!cancelled) {
        setVideoUrl(url);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [item.reelId]);

  // intersection observer for autoplay
  useEffect(() => {
    const el = containerRef.current;
    const vid = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (vid) {
          if (entry.isIntersecting) {
            vid.play().catch(() => {});
          } else {
            vid.pause();
          }
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [videoUrl]);

  const handleHeartClick = () => {
    if (liked) {
      onUnlike(item.reelId);
    } else {
      onLike(item.reelId, item.person.userId);
      setBursting(true);
      // spawn particles
      const newParticles = Array.from({ length: 6 }, (_, i) => ({
        id: Date.now() + i,
        dx: `${(Math.random() - 0.5) * 120}px`,
        dy: `${-40 - Math.random() * 100}px`,
        delay: `${i * 0.05}s`,
        size: 6 + Math.random() * 8,
      }));
      setParticles(newParticles);
      setTimeout(() => setBursting(false), 600);
      setTimeout(() => setParticles([]), 900);
    }
  };

  const reelLabel = `${item.index + 1}/${item.person.reels.length}`;

  return (
    <div ref={containerRef} style={slideStyle}>
      {/* video / loading */}
      {loading ? (
        <div style={shimmerStyle} />
      ) : videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          style={videoStyle}
          loop
          muted
          playsInline
          preload="auto"
        />
      ) : (
        <div style={errorSlideStyle}>
          <span style={{ fontSize: "2.5rem", marginBottom: 12 }}>&#x1F4F9;</span>
          <span style={{ color: "rgba(255,255,255,.5)", fontSize: ".9rem" }}>
            Reel unavailable
          </span>
        </div>
      )}

      {/* dark gradient overlay */}
      <div style={overlayGradientStyle} />

      {/* top info bar */}
      <div style={topBarStyle}>
        <div style={personChipStyle}>
          <div style={avatarDotStyle}>
            {item.person.displayName.charAt(0).toUpperCase()}
          </div>
          <span style={personNameStyle}>{item.person.displayName}</span>
        </div>
        <div style={reelBadgeStyle}>{reelLabel}</div>
      </div>

      {/* right-side action column */}
      <div style={actionColumnStyle}>
        {/* heart button */}
        <button
          onClick={handleHeartClick}
          style={{
            ...heartBtnStyle,
            ...(bursting ? { animation: "dr-heartBurst .6s var(--ease-spring)" } : {}),
          }}
          aria-label={liked ? "Unlike reel" : "Like reel"}
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill={liked ? "var(--hot-pink)" : "none"}
            stroke={liked ? "var(--hot-pink)" : "rgba(255,255,255,.85)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: liked ? "drop-shadow(0 0 12px var(--hot-pink))" : "none",
              transition: "all .25s var(--ease-spring)",
            }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {/* particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                background: "var(--hot-pink)",
                animation: `dr-particleDrift .7s var(--ease-out-expo) ${p.delay} forwards`,
                ["--dx" as any]: p.dx,
                ["--dy" as any]: p.dy,
                top: "50%",
                left: "50%",
                pointerEvents: "none",
              }}
            />
          ))}
        </button>

        {/* like counter */}
        <div style={likeCounterStyle}>
          <span
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color:
                likeCountForPerson >= threshold
                  ? "var(--hot-pink)"
                  : "rgba(255,255,255,.9)",
              transition: "color .3s",
            }}
          >
            {likeCountForPerson}
          </span>
          <span
            style={{
              fontSize: ".7rem",
              color: "rgba(255,255,255,.45)",
              fontWeight: 500,
            }}
          >
            /{threshold}
          </span>
        </div>
      </div>
    </div>
  );
});

/** Person intro card */
function IntroCard({ person }: { person: FeedPerson }) {
  const tags = person.tags
    ? person.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div style={slideStyle}>
      <div style={introBackdropStyle} />
      <div style={introContentStyle}>
        {/* similarity ring */}
        <div style={simRingOuterStyle}>
          <div style={simRingInnerStyle}>
            <span style={simNumberStyle}>{person.similarityScore}</span>
            <span style={simLabelStyle}>%</span>
          </div>
        </div>

        <h2 style={introNameStyle}>{person.displayName}</h2>

        {tags.length > 0 && (
          <div style={introTagsStyle}>
            {tags.slice(0, 6).map((tag, i) => (
              <span key={i} style={introTagPillStyle}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={introPromptStyle}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: "dr-chevronBounce 1.5s ease-in-out infinite" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>
            Scroll to see their reels
          </span>
        </div>
      </div>
    </div>
  );
}

/** Match popup overlay */
function MatchPopup({
  matchInfo,
  onDismiss,
}: {
  matchInfo: { displayName: string; igUsername: string };
  onDismiss: () => void;
}) {
  const floatingHearts = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: 8 + Math.random() * 84,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 1.5,
    size: 14 + Math.random() * 18,
  }));

  return (
    <div style={matchOverlayStyle}>
      {/* floating hearts */}
      {floatingHearts.map((h) => (
        <div
          key={h.id}
          style={{
            position: "absolute",
            left: `${h.left}%`,
            bottom: "20%",
            fontSize: h.size,
            animation: `dr-heartFloat ${h.duration}s ease-out ${h.delay}s infinite`,
            pointerEvents: "none",
            color: "var(--hot-pink)",
            opacity: 0.7,
          }}
        >
          &#x2764;
        </div>
      ))}

      <div style={matchCardStyle}>
        {/* ring pulse behind */}
        <div style={matchRingStyle} />
        <div style={{ ...matchRingStyle, animationDelay: ".4s" }} />

        <div
          style={{
            fontSize: "3.5rem",
            marginBottom: 8,
            animation: "dr-heartBurst 1s var(--ease-spring)",
          }}
        >
          &#x1F496;
        </div>
        <h2 style={matchTitleStyle}>It's a Match!</h2>
        <p style={matchSubStyle}>
          You and <strong>{matchInfo.displayName}</strong> vibed on each other's
          reels
        </p>

        <a
          href={`https://instagram.com/${matchInfo.igUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          style={matchIgBtnStyle}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          @{matchInfo.igUsername}
        </a>

        <button onClick={onDismiss} style={matchDismissBtnStyle}>
          Keep Swiping
        </button>
      </div>
    </div>
  );
}

/* ── main component ────────────────────────────────────── */

export default function Discover() {
  const [feed, setFeed] = useState<FeedPerson[]>([]);
  const [likedReelIds, setLikedReelIds] = useState<Set<string>>(new Set());
  const [likeThreshold, setLikeThreshold] = useState(3);
  const [personLikeCounts, setPersonLikeCounts] = useState<Map<number, number>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState<{
    displayName: string;
    igUsername: string;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollLocked = useRef(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    injectStyles();
  }, []);

  // load feed
  useEffect(() => {
    api
      .get<FeedResponse>("/discover/feed")
      .then((data) => {
        setFeed(data.feed);
        setLikedReelIds(new Set(data.likedReelIds));
        setLikeThreshold(data.likeThreshold);
        // compute initial like counts per person from likedReelIds
        const counts = new Map<number, number>();
        for (const person of data.feed) {
          let c = 0;
          for (const r of person.reels) {
            if (data.likedReelIds.includes(r)) c++;
          }
          if (c > 0) counts.set(person.userId, c);
        }
        setPersonLikeCounts(counts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // build flat feed items
  const items: FeedItem[] = [];
  for (const person of feed) {
    items.push({ kind: "intro", person });
    person.reels.forEach((reelId, index) => {
      items.push({ kind: "reel", person, reelId, index });
    });
  }

  const handleLike = useCallback(
    async (reelId: string, ownerId: number) => {
      // optimistic
      setLikedReelIds((prev) => new Set(prev).add(reelId));
      setPersonLikeCounts((prev) => {
        const next = new Map(prev);
        next.set(ownerId, (next.get(ownerId) || 0) + 1);
        return next;
      });

      try {
        const res = await api.post<ReelLikeResponse>("/discover/reel-like", {
          reelId,
          ownerId,
        });
        // sync server count
        setPersonLikeCounts((prev) => {
          const next = new Map(prev);
          next.set(ownerId, res.likeCount);
          return next;
        });
        if (res.mutual && res.matchInfo) {
          setMatchPopup(res.matchInfo);
        }
      } catch {
        // revert
        setLikedReelIds((prev) => {
          const next = new Set(prev);
          next.delete(reelId);
          return next;
        });
        setPersonLikeCounts((prev) => {
          const next = new Map(prev);
          const cur = next.get(ownerId) || 1;
          if (cur <= 1) next.delete(ownerId);
          else next.set(ownerId, cur - 1);
          return next;
        });
      }
    },
    []
  );

  const handleUnlike = useCallback(async (reelId: string) => {
    setLikedReelIds((prev) => {
      const next = new Set(prev);
      next.delete(reelId);
      return next;
    });
    try {
      await api.post("/discover/reel-unlike", { reelId });
    } catch {
      setLikedReelIds((prev) => new Set(prev).add(reelId));
    }
  }, []);

  // advance exactly one slide, then lock for the duration of the transition
  const advance = useCallback(
    (dir: 1 | -1) => {
      if (scrollLocked.current) return;
      setCurrentIndex((prev) => {
        const next = prev + dir;
        if (next < 0 || next >= items.length) return prev;
        scrollLocked.current = true;
        setTimeout(() => {
          scrollLocked.current = false;
        }, 500); // match CSS transition duration
        return next;
      });
    },
    [items.length]
  );

  // wheel handler — one gesture = one reel
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 15) return; // ignore tiny jitter
      advance(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [advance]);

  // keyboard arrow handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); advance(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); advance(-1); }
      else if (e.key === " ") {
        e.preventDefault();
        const item = items[currentIndex];
        if (item?.kind === "reel") {
          if (likedReelIds.has(item.reelId)) {
            handleUnlike(item.reelId);
          } else {
            handleLike(item.reelId, item.person.userId);
          }
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, currentIndex, items, likedReelIds, handleLike, handleUnlike]);

  // touch handlers
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(dy) < 40) return; // ignore tiny swipes
      advance(dy > 0 ? 1 : -1);
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [advance]);

  /* ── render ──────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={fullScreenCenterStyle}>
        <div className="spinner" />
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div style={fullScreenCenterStyle}>
        <div style={emptyStateStyle}>
          <div style={{ fontSize: "3.2rem", marginBottom: 16 }}>💔</div>
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 6,
            }}
          >
            No reels to discover yet
          </h3>
          <p
            style={{
              fontSize: ".9rem",
              color: "var(--text-muted)",
              maxWidth: 320,
              lineHeight: 1.5,
            }}
          >
            When people start watching reels with the extension, their content
            will appear here for you to vibe with
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={scrollRef} className="dr-scroll-container" style={scrollContainerStyle}>
        <div
          style={{
            transform: `translateY(calc(-${currentIndex} * (100vh - ${NAV_H}px)))`,
            transition: "transform .45s cubic-bezier(.25,.1,.25,1)",
            willChange: "transform",
          }}
        >
          {items.map((item) => {
            if (item.kind === "intro") {
              return (
                <IntroCard
                  key={`intro-${item.person.userId}`}
                  person={item.person}
                />
              );
            }
            return (
              <ReelSlide
                key={`reel-${item.reelId}`}
                item={item}
                liked={likedReelIds.has(item.reelId)}
                likeCountForPerson={
                  personLikeCounts.get(item.person.userId) || 0
                }
                threshold={likeThreshold}
                onLike={handleLike}
                onUnlike={handleUnlike}
              />
            );
          })}
        </div>
      </div>

      {matchPopup && (
        <MatchPopup
          matchInfo={matchPopup}
          onDismiss={() => setMatchPopup(null)}
        />
      )}
    </>
  );
}

/* ── styles ────────────────────────────────────────────── */

const vh = `calc(100vh - ${NAV_H}px)`;

const scrollContainerStyle: CSSProperties = {
  height: vh,
  overflowY: "hidden",
  background: "var(--reel-bg)",
  msOverflowStyle: "none",
  scrollbarWidth: "none",
  position: "relative",
};

const slideStyle: CSSProperties = {
  height: vh,
  position: "relative",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--reel-bg)",
  flexShrink: 0,
};

const videoStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
};

const overlayGradientStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(to bottom, rgba(0,0,0,.55) 0%, transparent 25%, transparent 60%, rgba(0,0,0,.7) 100%)",
  pointerEvents: "none",
  zIndex: 1,
};

const shimmerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(90deg, var(--reel-shimmer-a) 25%, var(--reel-shimmer-b) 50%, var(--reel-shimmer-a) 75%)",
  backgroundSize: "800px 100%",
  animation: "dr-shimmer 1.5s infinite linear",
};

const errorSlideStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
};

/* top bar */
const topBarStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 18px",
  zIndex: 2,
};

const personChipStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "rgba(0,0,0,.45)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "var(--radius-full)",
  padding: "6px 14px 6px 6px",
  border: "1px solid rgba(255,255,255,.08)",
};

const avatarDotStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "linear-gradient(135deg, var(--rose-500), var(--hot-pink))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: ".8rem",
  fontWeight: 700,
  color: "white",
};

const personNameStyle: CSSProperties = {
  color: "rgba(255,255,255,.92)",
  fontSize: ".88rem",
  fontWeight: 600,
  letterSpacing: "-.01em",
};

const reelBadgeStyle: CSSProperties = {
  background: "rgba(0,0,0,.45)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "var(--radius-full)",
  padding: "6px 14px",
  fontSize: ".78rem",
  fontWeight: 600,
  color: "rgba(255,255,255,.7)",
  border: "1px solid rgba(255,255,255,.08)",
  letterSpacing: ".04em",
};

/* action column */
const actionColumnStyle: CSSProperties = {
  position: "absolute",
  right: 16,
  bottom: "20%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  zIndex: 2,
};

const heartBtnStyle: CSSProperties = {
  position: "relative",
  width: 56,
  height: 56,
  borderRadius: "50%",
  background: "rgba(0,0,0,.35)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "transform .2s var(--ease-spring), background .2s",
  outline: "none",
  padding: 0,
};

const likeCounterStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 2,
  marginTop: 2,
};

/* intro card */
const introBackdropStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(145deg, var(--reel-intro-a) 0%, var(--reel-intro-b) 30%, var(--reel-intro-c) 60%, var(--reel-intro-a) 100%)",
  backgroundSize: "200% 200%",
  animation: "dr-gradientShift 8s ease infinite",
};

const introContentStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 20,
  padding: "40px 24px",
  animation: "dr-fadeUp .7s var(--ease-out-expo) both",
};

const simRingOuterStyle: CSSProperties = {
  width: 100,
  height: 100,
  borderRadius: "50%",
  background:
    "conic-gradient(var(--hot-pink) 0%, var(--rose-400) 50%, var(--hot-pink) 100%)",
  padding: 3,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 0 40px rgba(255,45,120,.3)",
};

const simRingInnerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  background: "var(--reel-sim-ring-bg)",
  display: "flex",
  alignItems: "baseline",
  justifyContent: "center",
  paddingTop: 28,
};

const simNumberStyle: CSSProperties = {
  fontSize: "2.2rem",
  fontWeight: 800,
  background: "linear-gradient(135deg, var(--rose-300), var(--hot-pink))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  lineHeight: 1,
};

const simLabelStyle: CSSProperties = {
  fontSize: ".9rem",
  fontWeight: 600,
  color: "var(--rose-400)",
  marginLeft: 2,
};

const introNameStyle: CSSProperties = {
  fontSize: "2rem",
  fontWeight: 800,
  color: "var(--text-primary)",
  letterSpacing: "-.03em",
  textAlign: "center",
};

const introTagsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: 8,
  maxWidth: 380,
};

const introTagPillStyle: CSSProperties = {
  padding: "6px 16px",
  borderRadius: "var(--radius-full)",
  fontSize: ".8rem",
  fontWeight: 500,
  background: "var(--surface-glass)",
  color: "var(--text-secondary)",
  border: "1px solid var(--border-subtle)",
  backdropFilter: "blur(8px)",
};

const introPromptStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  marginTop: 24,
};

/* match popup */
const matchOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(0,0,0,.82)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const matchCardStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  padding: "48px 40px 36px",
  borderRadius: "var(--radius-xl)",
  background:
    "linear-gradient(160deg, rgba(45,10,62,.9) 0%, rgba(15,5,21,.95) 100%)",
  border: "1px solid rgba(255,45,120,.25)",
  boxShadow: "0 0 80px rgba(255,45,120,.2), 0 0 200px rgba(255,45,120,.08)",
  maxWidth: 380,
  width: "90vw",
  animation: "dr-matchIn .7s var(--ease-spring) both",
  textAlign: "center",
};

const matchRingStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  width: 80,
  height: 80,
  marginTop: -40,
  marginLeft: -40,
  borderRadius: "50%",
  border: "2px solid rgba(255,45,120,.3)",
  animation: "dr-ringPulse 2s ease-out infinite",
  pointerEvents: "none",
};

const matchTitleStyle: CSSProperties = {
  fontSize: "1.8rem",
  fontWeight: 800,
  background: "linear-gradient(135deg, var(--rose-300), var(--hot-pink))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  letterSpacing: "-.02em",
};

const matchSubStyle: CSSProperties = {
  fontSize: ".92rem",
  color: "rgba(255,255,255,.6)",
  lineHeight: 1.5,
  maxWidth: 280,
};

const matchIgBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "14px 28px",
  borderRadius: "var(--radius-full)",
  background: "linear-gradient(135deg, var(--rose-500), var(--hot-pink))",
  color: "white",
  textDecoration: "none",
  fontSize: ".95rem",
  fontWeight: 700,
  marginTop: 8,
  boxShadow: "0 4px 24px rgba(255,45,120,.35)",
  transition: "transform .2s var(--ease-spring), box-shadow .2s",
  letterSpacing: "-.01em",
};

const matchDismissBtnStyle: CSSProperties = {
  background: "none",
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: "var(--radius-full)",
  padding: "10px 24px",
  color: "rgba(255,255,255,.5)",
  fontSize: ".85rem",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
  transition: "all .2s",
  marginTop: 4,
};

/* utility */
const fullScreenCenterStyle: CSSProperties = {
  height: vh,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--reel-bg)",
};

const emptyStateStyle: CSSProperties = {
  textAlign: "center",
  padding: "40px 24px",
  animation: "dr-fadeUp .6s var(--ease-out-expo) both",
};
