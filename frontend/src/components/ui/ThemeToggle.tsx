import React, { useState, useEffect } from "react";
import { themeService } from "@/services/themeService";
import { Sun, Moon } from "lucide-react";

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => themeService.isDarkMode());

  useEffect(() => {
    themeService.init();
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    themeService.setDarkMode(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="h-9 w-9 rounded-xl border border-border/70 hover:bg-muted/70 flex items-center justify-center text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
};
