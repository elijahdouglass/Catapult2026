import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
    background: "rgba(255, 248, 250, 0.75)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid var(--border-subtle)",
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
    marginLeft: 8,
  },
};

export default function Navbar() {
  const { logout } = useAuth();
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
      <div style={styles.logoArea}>
        <img src="/assets/logo.webp" alt="Reel Rizz" style={styles.logoImg} />
        <span style={styles.logoText}>Reel Rizz</span>
      </div>

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
