"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { transitionTheme } from "@/lib/app/theme";
import type { MouseEvent } from "react";

export default function ThemeToggle() {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    void transitionTheme({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Toggle color mode"
      onClick={handleClick}
    >
      <span className="theme-toggle-thumb" aria-hidden="true" />
      <span className="theme-toggle-icon theme-toggle-moon" aria-hidden="true">
        <Moon size={13} weight="fill" />
      </span>
      <span className="theme-toggle-icon theme-toggle-sun" aria-hidden="true">
        <Sun size={13} weight="fill" />
      </span>
    </button>
  );
}
