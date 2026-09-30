"use client";

import { resolveTheme, subscribeTheme, type Theme } from "@/lib/app/theme";
import { useEffect, useSyncExternalStore } from "react";

const THEME_COLOR: Record<Theme, string> = {
  dark: "#080808",
  light: "#f4ebe3",
};

export default function PwaThemeColor() {
  const theme = useSyncExternalStore(subscribeTheme, resolveTheme, () => "dark" as Theme);

  useEffect(() => {
    const content = THEME_COLOR[theme];
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  }, [theme]);

  return null;
}
