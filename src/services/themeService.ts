export interface ThemeAccent {
  id: string;
  name: string;
  primaryHsl: string;
  ringHsl: string;
  colorHex: string;
  gradient: string;
}

export const THEME_ACCENTS: ThemeAccent[] = [
  {
    id: "apex-rose",
    name: "Crimson Rose",
    primaryHsl: "347 77% 50%",
    ringHsl: "347 77% 50%",
    colorHex: "#e11d48",
    gradient: "linear-gradient(145deg, #e11d48 0%, #9f1239 100%)",
  },
  {
    id: "apex-royal",
    name: "Apex Royal Blue",
    primaryHsl: "220 80% 35%",
    ringHsl: "220 80% 45%",
    colorHex: "#1241a1",
    gradient: "linear-gradient(145deg, #1241a1 0%, #0a2768 100%)",
  },
  {
    id: "cobalt",
    name: "Vibrant Cobalt",
    primaryHsl: "220 90% 48%",
    ringHsl: "220 90% 48%",
    colorHex: "#1d58d8",
    gradient: "linear-gradient(135deg, #1d58d8, #3b82f6)",
  },
  {
    id: "violet",
    name: "Royal Violet",
    primaryHsl: "270 75% 45%",
    ringHsl: "270 75% 45%",
    colorHex: "#7c3aed",
    gradient: "linear-gradient(135deg, hsl(270 75% 45%), hsl(290 60% 50%))",
  },
  {
    id: "amber",
    name: "Sunset Amber",
    primaryHsl: "35 92% 45%",
    ringHsl: "35 92% 45%",
    colorHex: "#d97706",
    gradient: "linear-gradient(135deg, hsl(35 92% 45%), hsl(20 80% 50%))",
  },
];

const ACCENT_STORAGE_KEY = "app_theme_accent";
const MODE_STORAGE_KEY = "app_theme_mode";

class ThemeService {
  getActiveAccent(): ThemeAccent {
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (saved) {
        if (saved === "apex-royal" || saved === "apex-forest") {
          localStorage.removeItem(ACCENT_STORAGE_KEY);
          return THEME_ACCENTS[0];
        }
        const found = THEME_ACCENTS.find((a) => a.id === saved || (saved === "rose" && a.id === "apex-rose"));
        if (found) return found;
      }
    } catch {
      // ignore
    }
    return THEME_ACCENTS[0];
  }

  setAccent(accentId: string): void {
    const accent = THEME_ACCENTS.find((a) => a.id === accentId) || THEME_ACCENTS[0];
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent.id);
    } catch {}
    this.applyAccent(accent);
  }

  applyAccent(accent?: ThemeAccent): void {
    const active = accent || this.getActiveAccent();
    const isDark = this.isDarkMode();
    if (isDark && (active.id === "apex-rose" || active.id === "rose")) {
      document.documentElement.style.setProperty("--primary", "347 85% 62%");
      document.documentElement.style.setProperty("--ring", "347 85% 62%");
    } else if (isDark && active.id === "apex-royal") {
      document.documentElement.style.setProperty("--primary", "220 85% 55%");
      document.documentElement.style.setProperty("--ring", "220 85% 55%");
    } else {
      document.documentElement.style.setProperty("--primary", active.primaryHsl);
      document.documentElement.style.setProperty("--ring", active.ringHsl);
    }
    document.documentElement.style.setProperty("--gradient-primary", active.gradient);
  }

  isDarkMode(): boolean {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved !== null) {
        return saved === "dark";
      }
    } catch {}
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  setDarkMode(isDark: boolean): void {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, isDark ? "dark" : "light");
    } catch {}
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Reapply accent in case dark mode has different contrast needs
    this.applyAccent();
  }

  init(): void {
    const isDark = this.isDarkMode();
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    this.applyAccent();
  }
}

export const themeService = new ThemeService();
