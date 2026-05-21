import { useEffect, useState } from "react";

export type MobileTheme = "light" | "dark";
export type MobileSeverity = "baixa" | "media" | "alta" | "critica";

const MOBILE_THEME_KEY = "mobile_theme_preference";

export const MOBILE_SEVERITY_CLASS: Record<MobileSeverity, string> = {
  baixa: "bg-info text-info-foreground",
  media: "bg-warning text-warning-foreground",
  alta: "bg-warning text-warning-foreground",
  critica: "bg-destructive text-destructive-foreground",
};

export const MOBILE_SEVERITY_DOT_CLASS: Record<MobileSeverity, string> = {
  baixa: "bg-info",
  media: "bg-warning",
  alta: "bg-warning",
  critica: "bg-destructive",
};

function getSystemTheme(): MobileTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function readStoredTheme(): MobileTheme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(MOBILE_THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : getSystemTheme();
}

function applyMobileTheme(theme: MobileTheme) {
  document.documentElement.dataset.mobileTheme = theme;
}

export function clearMobileTheme() {
  delete document.documentElement.dataset.mobileTheme;
}

export function useMobileTheme() {
  const [theme, setTheme] = useState<MobileTheme>(readStoredTheme);

  useEffect(() => {
    applyMobileTheme(theme);
    localStorage.setItem(MOBILE_THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
  };
}
