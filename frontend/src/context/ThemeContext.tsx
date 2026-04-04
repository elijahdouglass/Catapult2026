import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>(null!);

// Heart SVG data URI for the view-transition mask
const HEART_SVG = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='white' d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/></svg>`
)}")`;

// Inject the view-transition CSS once
const VT_STYLE_ID = "theme-view-transition-styles";
function injectViewTransitionStyles() {
  if (document.getElementById(VT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = VT_STYLE_ID;
  style.textContent = `
    ::view-transition-old(root),
    .dark ::view-transition-old(root) {
      animation: none;
      animation-fill-mode: both;
      z-index: -1;
    }

    ::view-transition-new(root) {
      mask: ${HEART_SVG} center / 0 no-repeat;
      animation: vt-heart-scale 1s;
      animation-fill-mode: both;
    }

    .dark ::view-transition-new(root) {
      mask: ${HEART_SVG} center / 0 no-repeat;
      animation: vt-heart-scale 1s;
      animation-fill-mode: both;
    }

    @keyframes vt-heart-scale {
      to {
        mask-size: 200vmax;
      }
    }
  `;
  document.head.appendChild(style);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) {
      document.documentElement.classList.toggle("dark", saved === "dark");
      return saved;
    }
    return "light";
  });

  injectViewTransitionStyles();

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "light" ? "dark" : "light";

    const apply = () => {
      document.documentElement.classList.toggle("dark", next === "dark");
      setTheme(next);
      localStorage.setItem("theme", next);
    };

    if (document.startViewTransition) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
