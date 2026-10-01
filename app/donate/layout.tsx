import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  title: "Donate · StayLokal",
  description:
    "Support StayLokal development with an optional donation. File tools stay private in your browser—no upload, no account.",
  path: "/donate",
});

export default function DonateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
