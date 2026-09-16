"use client";

import { Crown } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { RankedSponsor } from "@/lib/sponsors/types";
import SponsorModal from "./SponsorModal";

const previewColors = ["#f44336", "#a259ff", "#4d7cff", "#777", "#82b9a8"];

export default function SponsorRail() {
  const [sponsors, setSponsors] = useState<RankedSponsor[]>([]);
  const [configured, setConfigured] = useState(false);
  const [modalRank, setModalRank] = useState<number | null>(null);
  const [selected, setSelected] = useState<RankedSponsor | null>(null);

  useEffect(() => {
    let active = true;
    const openModal = () => setModalRank(5);
    const closeModal = () => {
      setModalRank(null);
      setSelected(null);
    };
    window.addEventListener("open-sponsor-modal", openModal);
    window.addEventListener("close-sponsor-modal", closeModal);
    fetch("/api/sponsors/leaderboard")
      .then(async (response) => (await response.json()) as { configured?: boolean; sponsors?: RankedSponsor[] })
      .then((result) => {
        if (!active) return;
        setConfigured(Boolean(result.configured));
        setSponsors(result.sponsors ?? []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      window.removeEventListener("open-sponsor-modal", openModal);
      window.removeEventListener("close-sponsor-modal", closeModal);
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  const displaySponsors = configured ? sponsors : [];

  return (
    <>
      <aside className={`sponsor-stack all-tools-sponsor-stack ${displaySponsors.length ? "" : "sponsor-stack-unavailable"}`} aria-label="Sponsored placements">
        <span className="sponsor-orbit" aria-hidden="true" />
        {displaySponsors.length === 0 && <span>No sponsor placements yet.</span>}
        {displaySponsors.map((sponsor, index) => (
          <div className={`sponsor-card sponsor-card-rank-${sponsor.rank} ${index === 0 ? "sponsor-card-featured" : ""}`} key={sponsor.id}>
            <button className="sponsor-card-main" type="button" onClick={() => setSelected(sponsor)}>
              <span
                className={`sponsor-mark ${sponsor.logoUrl ? "has-sponsor-logo" : ""}`}
                style={{ backgroundColor: previewColors[index % previewColors.length], backgroundImage: sponsor.logoUrl ? `url("${sponsor.logoUrl}")` : undefined }}
              >
                {sponsor.companyName.slice(0, 1)}
              </span>
              <span className="sponsor-card-copy">
                <strong>{sponsor.companyName}</strong>
                <small>#{index + 1}</small>
              </span>
              {index === 0 && <Crown className="sponsor-crown" size={13} weight="fill" />}
              <strong className="sponsor-amount">${(sponsor.bidCents / 100).toFixed(0)}</strong>
            </button>
            <button className="sponsor-card-action" type="button" onClick={() => setModalRank(sponsor.rank)}>Outbid #{sponsor.rank}</button>
          </div>
        ))}
      </aside>
      {modalRank !== null && <SponsorModal sponsors={displaySponsors} initialRank={modalRank} onClose={() => setModalRank(null)} />}
      {selected && (
        <div className="sponsor-details-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="sponsor-details-modal" role="dialog" aria-modal="true" aria-labelledby="all-tools-sponsor-details-title">
            <button className="sponsor-details-close" type="button" aria-label="Close sponsor details" onClick={() => setSelected(null)}>×</button>
            <span
              className="sponsor-details-mark"
              style={{
                backgroundColor: previewColors[(selected.rank - 1) % previewColors.length],
                backgroundImage: selected.logoUrl ? `url("${selected.logoUrl}")` : undefined,
              }}
            >
              {!selected.logoUrl && selected.companyName.slice(0, 1)}
            </span>
            <p className="eyebrow">Sponsored placement · #{selected.rank}</p>
            <h2 id="all-tools-sponsor-details-title">{selected.companyName}</h2>
            <p className="sponsor-details-category">{selected.category}</p>
            <p className="sponsor-details-description">{selected.description}</p>
            <div className="sponsor-details-actions">
              <a href={selected.destinationUrl} target="_blank" rel="noreferrer">Visit website ↗</a>
              <button type="button" onClick={() => { setSelected(null); setModalRank(selected.rank); }}>Outbid #{selected.rank}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
