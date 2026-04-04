import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { CSSProperties } from "react";

const styles: Record<string, CSSProperties> = {
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    background: "var(--surface-glass)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid var(--border-subtle)",
    transition: "background .3s ease",
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textDecoration: "none",
    color: "var(--rose-700)",
  },
  logoImg: {
    width: 36,
    height: 36,
    objectFit: "contain" as const,
  },
  logoText: {
    fontSize: "1.15rem",
    fontWeight: 700,
    background: "linear-gradient(135deg, var(--rose-600), var(--hot-pink))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.02em",
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  link: {
    padding: "8px 18px",
    borderRadius: "var(--radius-full)",
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    textDecoration: "none",
    transition: "all 0.25s ease",
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: "var(--radius-full)",
    background: "transparent",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.25s ease",
    padding: 0,
    marginLeft: 4,
  },
  logoutBtn: {
    padding: "8px 18px",
    borderRadius: "var(--radius-full)",
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "var(--text-muted)",
    background: "transparent",
    border: "1px solid var(--border-subtle)",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    transition: "all 0.25s ease",
    marginLeft: 4,
  },
};

export default function Navbar() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const activeLinkStyle: CSSProperties = {
    ...styles.link,
    color: "var(--rose-600)",
    background: "rgba(232, 67, 111, 0.08)",
    fontWeight: 600,
  };

  return (
    <nav style={styles.nav}>
      <a href="/" style={styles.logoArea}>
        <img src="/assets/logo.webp" alt="Reel Rizz" style={styles.logoImg} />
        <span style={styles.logoText}>Reel Rizz</span>
      </a>

      <div style={styles.links}>
        <NavLink
          to="/discover"
          style={({ isActive }) => (isActive ? activeLinkStyle : styles.link)}
        >
          Discover
        </NavLink>
        <NavLink
          to="/matches"
          style={({ isActive }) => (isActive ? activeLinkStyle : styles.link)}
        >
          Matches
        </NavLink>
        <button
          style={styles.themeBtn}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
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
        <button
          style={styles.logoutBtn}
          onClick={handleLogout}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "var(--rose-600)";
            e.currentTarget.style.borderColor = "var(--border-accent)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.borderColor = "var(--border-subtle)";
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
