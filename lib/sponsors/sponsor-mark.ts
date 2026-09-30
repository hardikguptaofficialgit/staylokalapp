import type { CSSProperties } from "react";
import { isSafePublicHttpsUrl } from "./safe-asset-url";

export const SPONSOR_MARK_COLORS = ["#f44336", "#a259ff", "#4d7cff", "#777", "#82b9a8"];

export function sponsorMarkStyle(index: number, logoUrl?: string): CSSProperties {
  if (logoUrl && isSafePublicHttpsUrl(logoUrl)) {
    return { backgroundImage: `url("${logoUrl.replace(/"/g, "%22")}")` };
  }
  return { backgroundColor: SPONSOR_MARK_COLORS[index % SPONSOR_MARK_COLORS.length] };
}
