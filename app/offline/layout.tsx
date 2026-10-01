import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  title: "Offline · StayLokal",
  description:
    "StayLokal offline mode: cached browser file tools still run locally. Reconnect for sponsor, donate, or checkout.",
  path: "/offline",
});

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
