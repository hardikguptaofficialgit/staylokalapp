import { describe, expect, it } from "vitest";
import { PUBLIC_SITEMAP_PATHS, SITE_DESCRIPTION, SITE_HOME_TITLE, SITE_URL } from "../lib/seo/site";
import { assertToolSeoCoverage, getAllToolSeo } from "../lib/seo/tool-seo";
import { tools } from "../lib/tools/registry";

describe("site SEO metadata", () => {
  it("keeps homepage title and description within search snippet limits", () => {
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(SITE_DESCRIPTION.toLowerCase()).toMatch(/privacy-first|offline|browser/);
    expect(SITE_DESCRIPTION.toLowerCase()).toMatch(/upload|no account|device/);
    expect(SITE_HOME_TITLE.toLowerCase()).toMatch(/offline|privacy-first|browser/);
  });

  it("lists only public marketing routes in the sitemap", () => {
    const urls = PUBLIC_SITEMAP_PATHS.map((path) => (path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`));
    expect(urls).toEqual([
      "https://staylokal.app/",
      "https://staylokal.app/tools",
      "https://staylokal.app/privacy",
      "https://staylokal.app/donate",
      "https://staylokal.app/rules",
    ]);
    expect(urls.some((url) => url.includes("/tools/"))).toBe(false);
  });
});

describe("tool SEO metadata", () => {
  it("covers every exposed tool with unique titles and bounded descriptions", () => {
    assertToolSeoCoverage();
    const entries = getAllToolSeo();
    expect(entries.length).toBe(tools.length);
    const titles = new Set(entries.map((entry) => entry.seo.title));
    expect(titles.size).toBe(entries.length);
    for (const entry of entries) {
      expect(entry.seo.description.length).toBeLessThanOrEqual(160);
      expect(entry.seo.description.toLowerCase()).toMatch(/upload|local|browser|device|private|offline/);
    }
  });
});
