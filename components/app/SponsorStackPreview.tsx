"use client";

import { Crown } from "@phosphor-icons/react";
import { useMemo } from "react";
import { formatSponsorCardAmount, minimumBidForRank } from "@/lib/sponsors/ranking";
import { sponsorMarkStyle } from "@/lib/sponsors/sponsor-mark";
import type { RankedSponsor } from "@/lib/sponsors/types";

type SponsorStackPreviewProps = {
  sponsors: RankedSponsor[];
  targetRank: number;
  companyName: string;
  description: string;
  logoDataUrl: string;
  bidCents: number;
};

type PreviewRow = {
  rank: number;
  companyName: string;
  subtitle: string;
  logoUrl?: string;
  bidCents: number;
  isDraft: boolean;
  isOpen: boolean;
};

export default function SponsorStackPreview({
  sponsors,
  targetRank,
  companyName,
  description,
  logoDataUrl,
  bidCents,
}: SponsorStackPreviewProps) {
  const rows = useMemo(() => {
    return Array.from({ length: 5 }, (_, index) => {
      const rank = index + 1;
      if (rank === targetRank) {
        const name = companyName.trim() || "Your company";
        const tagline = description.trim();
        return {
          rank,
          companyName: name,
          subtitle: tagline || `#${rank}`,
          logoUrl: logoDataUrl || undefined,
          bidCents,
          isDraft: true,
          isOpen: false,
        } satisfies PreviewRow;
      }
      const existing = sponsors.find((sponsor) => sponsor.rank === rank);
      if (existing) {
        return {
          rank,
          companyName: existing.companyName,
          subtitle: `#${rank}`,
          logoUrl: existing.logoUrl,
          bidCents: existing.bidCents,
          isDraft: false,
          isOpen: false,
        } satisfies PreviewRow;
      }
      const minimum = minimumBidForRank(sponsors, rank);
      return {
        rank,
        companyName: "Open spot",
        subtitle: `#${rank}`,
        bidCents: minimum,
        isDraft: false,
        isOpen: true,
      } satisfies PreviewRow;
    });
  }, [bidCents, companyName, description, logoDataUrl, sponsors, targetRank]);

  return (
    <div className="sponsor-modal-preview" aria-live="polite" aria-label="Sponsor placement preview">
      <p className="sponsor-modal-preview-label">Live preview</p>
      <aside className="sponsor-stack sponsor-modal-stack">
        <span className="sponsor-orbit" aria-hidden="true" />
        {rows.map((row, index) => (
          <div
            className={`sponsor-card sponsor-card-rank-${row.rank} ${index === 0 ? "sponsor-card-featured" : ""} ${row.isDraft ? "is-draft-preview" : ""} ${row.isOpen ? "is-open-preview" : ""}`}
            key={row.rank}
          >
            <div className="sponsor-card-main sponsor-card-main-static">
              <span
                className={`sponsor-mark ${row.logoUrl ? "has-sponsor-logo" : ""}`}
                style={sponsorMarkStyle(index, row.logoUrl)}
              >
                {index === 0 && !row.logoUrl && <Crown className="sponsor-crown" size={11} weight="fill" />}
                {!row.logoUrl && row.companyName.slice(0, 1).toUpperCase()}
              </span>
              <span className="sponsor-card-copy">
                <strong>{row.companyName}</strong>
                <small>{row.subtitle}</small>
              </span>
              <strong className="sponsor-amount">{formatSponsorCardAmount(row.bidCents)}</strong>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
