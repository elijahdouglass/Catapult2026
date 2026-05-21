import { NavLink, useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { CSSProperties, useState, useEffect, useRef } from "react";
import VerifiedBadge from "./VerifiedBadge";
import WorldIdVerify from "./WorldIdVerify";

const MOBILE_BP = 640;

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
  hamburger: {
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
    padding: 0,
    transition: "all 0.25s ease",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 16,
    minWidth: 180,
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    boxShadow: "var(--shadow-lg, 0 8px 32px rgba(0,0,0,.12))",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    animation: "navDropIn .2s ease",
    zIndex: 200,
  },
  dropdownLink: {
    padding: "10px 16px",
    borderRadius: "var(--radius-md)",
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    textDecoration: "none",
    transition: "all 0.2s ease",
  },
  verifyBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: "var(--radius-full)",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#22c55e",
    background: "rgba(34, 197, 94, 0.08)",
    border: "1px solid rgba(34, 197, 94, 0.2)",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    transition: "all 0.25s ease",
    marginLeft: 4,
  },
  verifiedIndicator: {
    display: "flex",
    alignItems: "center",
    marginLeft: 4,
  },
  dropdownDivider: {
    height: 1,
    background: "var(--border-subtle)",
    margin: "4px 0",
  },
};

// inject dropdown animation
const sheet = document.createElement("style");
sheet.textContent = `
  @keyframes navDropIn {
    from { opacity: 0; transform: translateY(-8px) scale(.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`;
document.head.appendChild(sheet);

export default function Navbar() {
  const { user, refreshUser } = useAuth();
  const { signOut } = useClerk();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(window.innerWidth < MOBILE_BP);
  const [menuOpen, setMenuOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const activeLinkStyle: CSSProperties = {
    ...styles.link,
    color: "var(--rose-600)",
    background: "rgba(232, 67, 111, 0.08)",
    fontWeight: 600,
  };

  const activeDropdownStyle: CSSProperties = {
    ...styles.dropdownLink,
    color: "var(--rose-600)",
    background: "rgba(232, 67, 111, 0.08)",
    fontWeight: 600,
  };

  const navLinks = (
    <>
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
      {user?.worldIdVerified ? (
        <span style={styles.verifiedIndicator}>
          <VerifiedBadge compact />
        </span>
      ) : (
        <button
          style={styles.verifyBtn}
          onClick={() => setVerifyOpen(true)}
          title="Verify with World ID"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Verify
        </button>
      )}
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
    </>
  );

  const mobileMenu = (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        style={styles.hamburger}
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Menu"
      >
        {menuOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>
      {menuOpen && (
        <div style={styles.dropdown}>
          <NavLink
            to="/discover"
            onClick={() => setMenuOpen(false)}
            style={({ isActive }) =>
              isActive ? activeDropdownStyle : styles.dropdownLink
            }
          >
            Discover
          </NavLink>
          <NavLink
            to="/matches"
            onClick={() => setMenuOpen(false)}
            style={({ isActive }) =>
              isActive ? activeDropdownStyle : styles.dropdownLink
            }
          >
            Matches
          </NavLink>
          {user?.worldIdVerified ? (
            <div
              style={{
                ...styles.dropdownLink,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <VerifiedBadge />
            </div>
          ) : (
            <button
              style={{
                ...styles.dropdownLink,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--font-body)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#22c55e",
              }}
              onClick={() => {
                setVerifyOpen(true);
                setMenuOpen(false);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Verify with World ID
            </button>
          )}
          <div style={styles.dropdownDivider} />
          <button
            style={{
              ...styles.dropdownLink,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "var(--font-body)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
            onClick={() => {
              toggleTheme();
              setMenuOpen(false);
            }}
          >
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
          <button
            style={{
              ...styles.dropdownLink,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "var(--font-body)",
              color: "var(--text-muted)",
            }}
            onClick={() => {
              handleLogout();
              setMenuOpen(false);
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <nav style={styles.nav}>
      <a href="/" style={styles.logoArea}>
        <img src="/assets/logo.webp" alt="Reel Rizz" style={styles.logoImg} />
        <span style={styles.logoText}>Reel Rizz</span>
      </a>

      {mobile ? mobileMenu : <div style={styles.links}>{navLinks}</div>}

      <WorldIdVerify
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onVerified={() => {
          refreshUser();
          setVerifyOpen(false);
        }}
      />
    </nav>
  );
}
