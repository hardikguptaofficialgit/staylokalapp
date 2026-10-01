import type { MetadataRoute } from "next";
import { PUBLIC_SITEMAP_PATHS, SITE_URL } from "@/lib/seo/site";

const changeFrequency: Record<string, MetadataRoute.Sitemap[number]["changeFrequency"]> = {
  "/": "weekly",
  "/tools": "weekly",
  "/privacy": "monthly",
  "/donate": "monthly",
  "/rules": "monthly",
};

const priority: Record<string, number> = {
  "/": 1,
  "/tools": 0.9,
  "/privacy": 0.5,
  "/donate": 0.5,
  "/rules": 0.5,
};

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_SITEMAP_PATHS.map((path) => ({
    url: path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`,
    changeFrequency: changeFrequency[path],
    priority: priority[path],
  }));
}
