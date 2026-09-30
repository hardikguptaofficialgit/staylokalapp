import { MINIMUM_SPONSOR_BID_CENTS } from "./types";
import type { SponsorRecord, ValidatedSponsorClaim } from "./types";

const HANDLE_PATTERN = /^@?[a-zA-Z0-9._-]{2,64}$/;

export function parseSponsorDestinationInput(raw: string): { destinationUrl: string; handle?: string } | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 300) return null;

  if (HANDLE_PATTERN.test(trimmed)) {
    const handle = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
    return { destinationUrl: `https://x.com/${handle.slice(1)}`, handle };
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || !url.hostname) return null;
    return { destinationUrl: url.toString() };
  } catch {
    return null;
  }
}

export function normalizeSponsorDestinationKey(destinationUrl: string, handle?: string): string {
  if (handle) {
    return `x:${handle.replace(/^@/, "").toLowerCase()}`;
  }

  try {
    const url = new URL(destinationUrl);
    const host = url.hostname.toLowerCase();
    if (host === "x.com" || host === "twitter.com") {
      const user = url.pathname.replace(/^\//, "").split("/")[0]?.toLowerCase();
      if (user) return `x:${user}`;
    }
    url.hostname = host;
    const path = url.pathname.replace(/\/$/, "") || "/";
    return `https://${host}${path}`;
  } catch {
    return destinationUrl.trim().toLowerCase();
  }
}

export function findActiveSponsorByDestination(
  sponsors: SponsorRecord[],
  destinationUrl: string,
  handle?: string,
): SponsorRecord | undefined {
  const key = normalizeSponsorDestinationKey(destinationUrl, handle);
  return sponsors
    .filter((sponsor) => sponsor.status === "active")
    .find((sponsor) => normalizeSponsorDestinationKey(sponsor.destinationUrl, sponsor.handle) === key);
}

export type SponsorCheckoutAmounts =
  | {
    chargeCents: number;
    priorBidCents: number;
    priorSponsorId?: string;
    totalBidCents: number;
  }
  | { error: string };

/** Pending upgrade claims store the prior sponsor row id in `sponsorId` until activation. */
export function pendingUpgradeSponsorId(claimData: Record<string, unknown>): string {
  const status = String(claimData.status ?? "");
  if (status === "activated") return "";
  const legacyPrior = typeof claimData.priorSponsorId === "string" ? claimData.priorSponsorId.trim() : "";
  if (legacyPrior) return legacyPrior;
  const sponsorId = typeof claimData.sponsorId === "string" ? claimData.sponsorId.trim() : "";
  return sponsorId;
}

export function expectedSponsorChargeCents(
  claimData: Record<string, unknown>,
  sponsors: SponsorRecord[],
): number | null {
  const bidCents = typeof claimData.bidCents === "number" || typeof claimData.bidCents === "string"
    ? Number(claimData.bidCents)
    : Number.NaN;
  const totalBid = Number.isFinite(bidCents) ? Math.round(bidCents) : null;
  if (totalBid === null || !Number.isSafeInteger(totalBid)) return null;

  const destinationUrl = String(claimData.destinationUrl ?? "");
  if (!destinationUrl) return null;
  const handle = claimData.handle ? String(claimData.handle) : undefined;

  const pendingPriorId = pendingUpgradeSponsorId(claimData);
  const prior = pendingPriorId
    ? sponsors.find((sponsor) => sponsor.id === pendingPriorId)
    : findActiveSponsorByDestination(sponsors, destinationUrl, handle);
  const priorBidCents = prior?.bidCents ?? 0;
  const chargeCents = totalBid - priorBidCents;

  if (!Number.isInteger(chargeCents) || chargeCents < MINIMUM_SPONSOR_BID_CENTS) {
    return null;
  }
  return chargeCents;
}

export function computeSponsorCheckoutAmounts(
  sponsors: SponsorRecord[],
  claim: Pick<ValidatedSponsorClaim, "destinationUrl" | "handle" | "bidCents">,
): SponsorCheckoutAmounts {
  const prior = findActiveSponsorByDestination(sponsors, claim.destinationUrl, claim.handle);
  const priorBidCents = prior?.bidCents ?? 0;

  if (prior && claim.bidCents <= priorBidCents) {
    return { error: "Your new total bid must be higher than your current placement amount." };
  }

  const chargeCents = claim.bidCents - priorBidCents;
  if (!Number.isInteger(chargeCents) || chargeCents < MINIMUM_SPONSOR_BID_CENTS) {
    if (prior) {
      return {
        error: `Checkout requires at least $${(MINIMUM_SPONSOR_BID_CENTS / 100).toFixed(2)}. Raise your total bid by at least that much.`,
      };
    }
    return { error: "Bid amount is too low for checkout." };
  }

  return {
    chargeCents,
    priorBidCents,
    priorSponsorId: prior?.id,
    totalBidCents: claim.bidCents,
  };
}
