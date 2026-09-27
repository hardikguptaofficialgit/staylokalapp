import {
  MINIMUM_SPONSOR_BID_CENTS,
  SPONSOR_SLOT_COUNT,
  type RankedSponsor,
  type SponsorRecord,
  type SponsorStatus,
} from "./types";

export function sortSponsors(sponsors: SponsorRecord[]): SponsorRecord[] {
  return [...sponsors].sort((left, right) => (
    right.bidCents - left.bidCents
    || left.paidAt.localeCompare(right.paidAt)
    || left.id.localeCompare(right.id)
  ));
}

export function rankSponsors(sponsors: SponsorRecord[]): RankedSponsor[] {
  return sortSponsors(sponsors)
    .slice(0, SPONSOR_SLOT_COUNT)
    .map((sponsor, index) => ({ ...sponsor, rank: index + 1 }));
}

export function minimumBidForRank(sponsors: SponsorRecord[], targetRank: number): number {
  if (!Number.isInteger(targetRank) || targetRank < 1 || targetRank > SPONSOR_SLOT_COUNT) {
    return MINIMUM_SPONSOR_BID_CENTS;
  }

  const ranked = rankSponsors(sponsors);
  const current = ranked[targetRank - 1];
  return Math.max(MINIMUM_SPONSOR_BID_CENTS, (current?.bidCents ?? 0) + (current ? 1 : 0));
}

export function isBidEnoughForRank(
  sponsors: SponsorRecord[],
  targetRank: number,
  bidCents: number,
): boolean {
  return Number.isInteger(bidCents) && bidCents >= minimumBidForRank(sponsors, targetRank);
}

export function formatBid(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(cents / 100);
}

/** After a successful payment, decide leaderboard visibility and who gets outbid. */
export function activationOutcome(activeSponsors: SponsorRecord[], newSponsor: SponsorRecord) {
  const ranked = rankSponsors([...activeSponsors, newSponsor]);
  const visibleIds = new Set(ranked.map((sponsor) => sponsor.id));
  return {
    displacedIds: activeSponsors
      .filter((sponsor) => !visibleIds.has(sponsor.id))
      .map((sponsor) => sponsor.id),
    newSponsorStatus: (visibleIds.has(newSponsor.id) ? "active" : "outbid") as SponsorStatus,
  };
}
