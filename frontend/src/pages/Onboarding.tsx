import { useState, useRef, CSSProperties, FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tags, setTags] = useState<string[] | null>(null);
  const [dragOver, setDragOver] = useState(false);

  if (!user) return <Navigate to="/auth" replace />;
  if (user.onboarded) return <Navigate to="/discover" replace />;

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("screenshot", file);

      const data = await api.post<{ tags: string[] }>("/onboarding", formData);
      setTags(data.tags);
      await refreshUser();

      setTimeout(() => navigate("/discover"), 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (tags) {
    return (
      <div style={styles.wrapper}>
        <div style={{ ...styles.container, textAlign: "center" as const }}>
          <div style={styles.successIcon}>&#x2764;&#xFE0F;</div>
          <h2 style={styles.title}>Vibes captured!</h2>
          <p style={styles.subtitle}>Here's what we found in your feed:</p>
          <div style={styles.tagCloud}>
            {tags.map((tag, i) => (
              <span
                key={i}
                className="tag-pill"
                style={{
                  animationDelay: `${i * 0.05}s`,
                  animation: "fadeInUp 0.4s var(--ease-out-expo) both",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <p style={{ ...styles.subtitle, marginTop: 20 }}>
            Taking you to discover matches...
          </p>
          <div className="spinner" style={{ margin: "12px auto" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h1 style={styles.title}>Set up your vibe</h1>
        <p style={styles.subtitle}>
          Upload a screenshot of your Instagram Explore feed word bubbles so we
          can find people on your wavelength.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* File dropzone */}
          <div
            style={{
              ...styles.dropzone,
              ...(dragOver ? styles.dropzoneActive : {}),
              ...(preview ? styles.dropzoneHasFile : {}),
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {preview ? (
              <img src={preview} alt="Preview" style={styles.previewImg} />
            ) : (
              <>
                <div style={styles.dropIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--rose-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <p style={styles.dropText}>
                  Drop your screenshot here or <span style={{ color: "var(--rose-500)", fontWeight: 600 }}>browse</span>
                </p>
                <p style={styles.dropHint}>PNG, JPG up to 10MB</p>
              </>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading || !file}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 20, height: 20 }} />
                Reading your vibes... (may take awhile)
              </>
            ) : (
              "Analyze my feed"
            )}
          </button>
        </form>
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
    maxWidth: 480,
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-xl)",
    padding: "40px 36px",
    backdropFilter: "blur(24px)",
    boxShadow: "var(--shadow-lg)",
    animation: "scaleIn 0.5s var(--ease-out-expo) both",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: "0.92rem",
    color: "var(--text-muted)",
    lineHeight: 1.5,
    marginBottom: 24,
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
  },
  dropzone: {
    border: "2px dashed var(--border-accent)",
    borderRadius: "var(--radius-lg)",
    padding: "36px 24px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.25s ease",
    background: "rgba(232, 67, 111, 0.02)",
  },
  dropzoneActive: {
    borderColor: "var(--rose-500)",
    background: "rgba(232, 67, 111, 0.06)",
  },
  dropzoneHasFile: {
    padding: "12px",
    borderStyle: "solid" as const,
    borderColor: "var(--rose-300)",
  },
  dropIcon: {
    marginBottom: 4,
  },
  dropText: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
  },
  dropHint: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
  },
  previewImg: {
    width: "100%",
    maxHeight: 240,
    objectFit: "contain" as const,
    borderRadius: "var(--radius-md)",
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
  igInputWrap: {
    position: "relative" as const,
  },
  igAt: {
    position: "absolute" as const,
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
    fontWeight: 500,
    fontSize: "0.95rem",
    pointerEvents: "none" as const,
  },
  error: {
    fontSize: "0.85rem",
    color: "var(--coral)",
    background: "rgba(255, 107, 107, 0.08)",
    border: "1px solid rgba(255, 107, 107, 0.2)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 14px",
    textAlign: "center" as const,
  },
  successIcon: {
    fontSize: "3rem",
    marginBottom: 12,
    animation: "heartPulse 1s var(--ease-spring) infinite",
  },
  tagCloud: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
    justifyContent: "center",
    marginTop: 12,
  },
};
