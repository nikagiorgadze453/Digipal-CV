export type AppTheme = "light" | "dark";

const STORAGE_KEY = "digipal-theme";

export function getStoredTheme(): AppTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* private mode */
  }
  return null;
}

export function applyTheme(theme: AppTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}
