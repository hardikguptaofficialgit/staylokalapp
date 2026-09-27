export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "staylokal-theme";

export function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    /* private mode / blocked storage */
  }
  return null;
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

const themeListeners = new Set<() => void>();

export function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

function notifyThemeListeners() {
  themeListeners.forEach((listener) => listener());
}

export function persistTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    notifyThemeListeners();
  } catch {
    /* ignore */
  }
}

export function resolveTheme(): Theme {
  return readStoredTheme() ?? "dark";
}
