import { describe, expect, it } from "vitest";
import {
  activationOutcome,
  formatSponsorCardAmount,
  isBidEnoughForRank,
  minimumBidForRank,
  rankSponsors,
} from "../lib/sponsors/ranking";
import { normalizeSponsorLogoUrl, validateSponsorClaim } from "../lib/sponsors/validation";
import type { SponsorRecord } from "../lib/sponsors/types";

const sponsor = (id: string, bidCents: number, paidAt: string): SponsorRecord => ({
  bidCents,
  category: "AI Agents & Infrastructure",
  companyName: id,
  description: "A sponsor",
  destinationUrl: "https://example.com",
  id,
  paidAt,
  status: "active",
});

describe("sponsor ranking", () => {
  it("sorts by bid, then earlier successful payment, then stable id", () => {
    const result = rankSponsors([
      sponsor("b", 100, "2026-01-02"),
      sponsor("a", 100, "2026-01-01"),
      sponsor("c", 300, "2026-01-03"),
    ]);
    expect(result.map(({ id, rank }) => [id, rank])).toEqual([["c", 1], ["a", 2], ["b", 3]]);
  });

  it("requires one cent above the selected rank and displaces rank five", () => {
    const current = Array.from({ length: 5 }, (_, index) => sponsor(String(index), (5 - index) * 100, `2026-01-0${index + 1}`));
    expect(minimumBidForRank(current, 2)).toBe(401);
    expect(isBidEnoughForRank(current, 2, 400)).toBe(false);
    expect(isBidEnoughForRank(current, 2, 401)).toBe(true);
    expect(rankSponsors([...current, sponsor("new", 101, "2026-02-01")]).map((item) => item.id)).toEqual(["0", "1", "2", "3", "new"]);
  });

  it("uses the one dollar opening bid for empty positions", () => {
    expect(minimumBidForRank([], 5)).toBe(100);
  });

  it("marks a sixth-place payment as outbid instead of leaving a stray active row", () => {
    const current = Array.from({ length: 5 }, (_, index) => sponsor(String(index), (5 - index) * 100, `2026-01-0${index + 1}`));
    const newcomer = sponsor("new", 50, "2026-02-01");
    const outcome = activationOutcome(current, newcomer);
    expect(outcome.newSponsorStatus).toBe("outbid");
    expect(outcome.displacedIds).toEqual([]);
  });
});

describe("sponsor logo url", () => {
  it("drops empty values and legacy StayLokal placeholder logos", () => {
    expect(normalizeSponsorLogoUrl("")).toBeUndefined();
    expect(normalizeSponsorLogoUrl("https://staylokal.com/images/logo.png")).toBeUndefined();
    expect(normalizeSponsorLogoUrl("https://cdn.example.com/acme.png")).toBe("https://cdn.example.com/acme.png");
    expect(normalizeSponsorLogoUrl('https://evil.com/x");background:url(')).toBeUndefined();
    expect(normalizeSponsorLogoUrl("http://cdn.example.com/acme.png")).toBeUndefined();
  });
});

describe("sponsor claim validation", () => {
  it("accepts HTTPS URLs and handles", () => {
    expect(validateSponsorClaim({
      bidCents: 101,
      category: "Design & Creative",
      companyName: "Example",
      description: "A useful product",
      destination: "https://example.com",
    })?.destinationUrl).toBe("https://example.com/");
    expect(validateSponsorClaim({
      bidCents: 100,
      category: "AI Agents & Infrastructure",
      companyName: "Example",
      description: "A useful product",
      destination: "@example",
    })?.destinationUrl).toBe("https://x.com/example");
  });

  it("normalizes string and decimal bid values", () => {
    expect(validateSponsorClaim({
      bidCents: "101",
      category: "Design & Creative",
      companyName: "Example",
      description: "A useful product",
      destination: "https://example.com",
    })?.bidCents).toBe(101);
    expect(validateSponsorClaim({
      bidCents: 100.4,
      category: "Design & Creative",
      companyName: "Example",
      description: "A useful product",
      destination: "https://example.com",
    })?.bidCents).toBe(100);
  });

  it("rejects unsafe destinations and invalid categories", () => {
    expect(validateSponsorClaim({
      bidCents: 100,
      category: "AI Agents & Infrastructure",
      companyName: "Example",
      description: "A useful product",
      destination: "javascript:alert(1)",
    })).toBeNull();
    expect(validateSponsorClaim({
      bidCents: 100,
      category: "Unknown",
      companyName: "Example",
      description: "A useful product",
      destination: "https://example.com",
    })).toBeNull();
  });
});

describe("sponsor amount formatting", () => {
  it("shows distinct card amounts instead of rounding everything to whole dollars", () => {
    expect(formatSponsorCardAmount(100)).toBe("$1");
    expect(formatSponsorCardAmount(101)).toBe("$1.01");
    expect(formatSponsorCardAmount(250)).toBe("$2.50");
    expect(formatSponsorCardAmount(401)).toBe("$4.01");
  });
});
