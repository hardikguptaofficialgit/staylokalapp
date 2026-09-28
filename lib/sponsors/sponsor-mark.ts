import type { CSSProperties } from "react";

export const SPONSOR_MARK_COLORS = ["#f44336", "#a259ff", "#4d7cff", "#777", "#82b9a8"];

export function sponsorMarkStyle(index: number, logoUrl?: string): CSSProperties {
  if (logoUrl) return { backgroundImage: `url("${logoUrl}")` };
  return { backgroundColor: SPONSOR_MARK_COLORS[index % SPONSOR_MARK_COLORS.length] };
}
