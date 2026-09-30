import { describe, expect, it } from "vitest";
import {
  computeSponsorCheckoutAmounts,
  expectedSponsorChargeCents,
  findActiveSponsorByDestination,
  normalizeSponsorDestinationKey,
} from "../lib/sponsors/sponsor-identity";
import type { SponsorRecord } from "../lib/sponsors/types";

const active = (overrides: Partial<SponsorRecord> & Pick<SponsorRecord, "id" | "bidCents">): SponsorRecord => ({
  bidCents: overrides.bidCents,
  category: "Developer Tools",
  companyName: overrides.companyName ?? "Acme",
  description: "Tools",
  destinationUrl: overrides.destinationUrl ?? "https://example.com/",
  handle: overrides.handle,
  id: overrides.id,
  paidAt: "2026-01-01",
  status: "active",
});

describe("sponsor destination identity", () => {
  it("matches X handles and x.com URLs", () => {
    const keyA = normalizeSponsorDestinationKey("https://x.com/Acme", "@acme");
    const keyB = normalizeSponsorDestinationKey("https://x.com/acme");
    expect(keyA).toBe("x:acme");
    expect(keyB).toBe("x:acme");
    const sponsors = [
      active({ id: "a", bidCents: 2000, destinationUrl: "https://x.com/acme", handle: "@acme" }),
    ];
    expect(findActiveSponsorByDestination(sponsors, "https://x.com/Acme", "@Acme")?.id).toBe("a");
  });
});

describe("sponsor upgrade checkout", () => {
  it("charges only the difference for the same listing", () => {
    const sponsors = [active({ id: "mine", bidCents: 2000, destinationUrl: "https://product.io" })];
    const result = computeSponsorCheckoutAmounts(sponsors, {
      bidCents: 3000,
      destinationUrl: "https://product.io/",
    });
    expect(result).toEqual({
      chargeCents: 1000,
      priorBidCents: 2000,
      priorSponsorId: "mine",
      totalBidCents: 3000,
    });
  });

  it("charges the full bid for a new listing", () => {
    const result = computeSponsorCheckoutAmounts([], {
      bidCents: 2500,
      destinationUrl: "https://new.io",
    });
    expect(result).toEqual({
      chargeCents: 2500,
      priorBidCents: 0,
      priorSponsorId: undefined,
      totalBidCents: 2500,
    });
  });

  it("rejects bids that do not increase the listing total", () => {
    const sponsors = [active({ id: "mine", bidCents: 2000, destinationUrl: "https://product.io" })];
    expect(computeSponsorCheckoutAmounts(sponsors, {
      bidCents: 2000,
      destinationUrl: "https://product.io",
    })).toEqual({ error: "Your new total bid must be higher than your current placement amount." });
  });

  it("derives checkout charge from pending claim sponsor id", () => {
    const sponsors = [active({ id: "mine", bidCents: 2000, destinationUrl: "https://product.io" })];
    expect(expectedSponsorChargeCents({
      bidCents: 3000,
      destinationUrl: "https://product.io",
      sponsorId: "mine",
      status: "pending",
    }, sponsors)).toBe(1000);
  });

  it("requires at least a one dollar checkout payment on upgrades", () => {
    const sponsors = [active({ id: "mine", bidCents: 2000, destinationUrl: "https://product.io" })];
    expect(computeSponsorCheckoutAmounts(sponsors, {
      bidCents: 2050,
      destinationUrl: "https://product.io",
    })).toEqual({
      error: "Checkout requires at least $1.00. Raise your total bid by at least that much.",
    });
  });
});
