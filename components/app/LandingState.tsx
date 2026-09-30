"use client";

import {
  CloudArrowUp, Crown, FileJpg, FilePdf, FilePng, FilePpt, FileText, FileTxt, FileXls, FileZip,
  FilmStrip, Folder, Waveform, type IconProps,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import SponsorModal from "./SponsorModal";
import { readJsonResponse } from "@/lib/app/fetch-json";
import { formatSponsorCardAmount } from "@/lib/sponsors/ranking";
import { sponsorMarkStyle } from "@/lib/sponsors/sponsor-mark";
import type { RankedSponsor } from "@/lib/sponsors/types";
import type { AppWorkflow } from "./types";

type PhosphorIcon = React.ComponentType<IconProps>;

const supportedCategories: [string, PhosphorIcon][] = [
  ["PDF", FilePdf], ["JPG", FileJpg], ["DOC", FileText],
  ["PPT", FilePpt], ["PNG", FilePng], ["TXT", FileTxt], ["MP4", FilmStrip],
  ["XLS", FileXls], ["MP3", Waveform], ["ZIP", FileZip], ["Folder", Folder],
];

const categoryColors: Record<string, string> = {
  PDF: "#ef5b68",
  JPG: "#f0a34a",
  DOC: "#5f9cf7",
  PPT: "#ed8158",
  PNG: "#63c99a",
  TXT: "#a9b4c6",
  MP4: "#a78bfa",
  XLS: "#55bd83",
  MP3: "#c084fc",
  ZIP: "#e2b45d",
  Folder: "#d3ad62",
};

const categoryAccept: Record<string, string> = {
  PDF: "application/pdf",
  JPG: "image/*",
  DOC: ".doc,.docx,.odt",
  PPT: ".ppt,.pptx,.odp",
  PNG: "image/png",
  TXT: ".txt,.md,.csv",
  MP4: "video/*",
  XLS: ".xls,.xlsx,.ods",
  MP3: "audio/*",
  ZIP: ".zip,.7z,.rar",
};

function MaskedText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`landing-character-mask ${className}`} aria-label={text}>
      {Array.from(text).map((character, index) => (
        <span key={`${character}-${index}`} aria-hidden="true" className={character === " " ? "landing-character-space" : undefined}>
          {character === " " ? "\u00a0" : character}
        </span>
      ))}
    </span>
  );
}

export default function LandingState({ workflow, inputRef }: { workflow: AppWorkflow; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const [dragging, setDragging] = useState(false);
  function browseCategory(label: string) {
    const input = inputRef.current;
    if (!input) return;
    if (label === "Folder") {
      input.removeAttribute("accept");
      input.setAttribute("webkitdirectory", "");
    } else {
      input.removeAttribute("webkitdirectory");
      input.accept = categoryAccept[label] ?? "*/*";
    }
    input.click();
  }
  const [sponsors, setSponsors] = useState<RankedSponsor[]>([]);
  const [leaderboardConfigured, setLeaderboardConfigured] = useState(false);
  const [sponsorsLoading, setSponsorsLoading] = useState(true);
  const [sponsorsLoadFailed, setSponsorsLoadFailed] = useState(false);
  const [sponsorModalRank, setSponsorModalRank] = useState<number | null>(null);
  const [selectedSponsor, setSelectedSponsor] = useState<RankedSponsor | null>(null);

  useEffect(() => {
    let active = true;
    const loadSponsors = () => {
      setSponsorsLoading(true);
      setSponsorsLoadFailed(false);
      fetch("/api/sponsors/leaderboard")
        .then(async (response) => {
          const result = await readJsonResponse<{ configured?: boolean; sponsors?: RankedSponsor[] }>(response);
          if (!active) return;
          if (!response.ok) {
            setLeaderboardConfigured(false);
            setSponsors([]);
            setSponsorsLoadFailed(true);
            return;
          }
          setLeaderboardConfigured(Boolean(result.configured));
          setSponsors(result.sponsors ?? []);
        })
        .catch(() => {
          if (!active) return;
          setLeaderboardConfigured(false);
          setSponsors([]);
          setSponsorsLoadFailed(true);
        })
        .finally(() => {
          if (active) setSponsorsLoading(false);
        });
    };
    const openSponsorModal = () => setSponsorModalRank(5);
    const closeSponsorModal = () => {
      setSponsorModalRank(null);
      setSelectedSponsor(null);
    };
    window.addEventListener("open-sponsor-modal", openSponsorModal);
    window.addEventListener("close-sponsor-modal", closeSponsorModal);
    window.addEventListener("sponsor-leaderboard-refresh", loadSponsors);
    loadSponsors();
    return () => {
      active = false;
      window.removeEventListener("open-sponsor-modal", openSponsorModal);
      window.removeEventListener("close-sponsor-modal", closeSponsorModal);
      window.removeEventListener("sponsor-leaderboard-refresh", loadSponsors);
    };
  }, []);

  useEffect(() => {
    if (!selectedSponsor) return;
    function closeDetails(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedSponsor(null);
    }
    window.addEventListener("keydown", closeDetails);
    return () => window.removeEventListener("keydown", closeDetails);
  }, [selectedSponsor]);

  const displaySponsors = leaderboardConfigured ? sponsors : [];

  return (
    <>
      <div className="landing-hero flex flex-col items-center animate-fade-in text-center">
        <aside className={`sponsor-stack ${sponsorsLoading ? "sponsor-stack-loading" : displaySponsors.length ? "" : "sponsor-stack-unavailable"}`} id="sponsors" aria-label="Sponsored placements">
          <span className="sponsor-mobile-label">Sponsored</span>
          <span className="sponsor-orbit" aria-hidden="true" />
          {sponsorsLoading && [1, 2].map((rank) => (
            <div className={`sponsor-card sponsor-skeleton-card sponsor-card-rank-${rank}`} key={`skeleton-${rank}`} aria-hidden="true">
              <span className="sponsor-skeleton-mark" />
              <span className="sponsor-skeleton-copy">
                <span />
                <span />
              </span>
              <span className="sponsor-skeleton-amount" />
            </div>
          ))}
          {!sponsorsLoading && sponsorsLoadFailed && <span>Sponsor leaderboard is temporarily unavailable.</span>}
          {!sponsorsLoading && !sponsorsLoadFailed && displaySponsors.length === 0 && <span>No sponsor placements yet.</span>}
          {!sponsorsLoading && displaySponsors.map((sponsor, index) => (
            <div className={`sponsor-card sponsor-card-rank-${sponsor.rank} ${index === 0 ? "sponsor-card-featured" : ""}`} key={sponsor.id}>
              <button className="sponsor-card-main" type="button" onClick={() => setSelectedSponsor(sponsor)}>
                <span className={`sponsor-mark ${sponsor.logoUrl ? "has-sponsor-logo" : ""}`} style={sponsorMarkStyle(index, sponsor.logoUrl)}>
                  {index === 0 && !sponsor.logoUrl && <Crown className="sponsor-crown" size={11} weight="fill" />}
                  {sponsor.companyName.slice(0, 1)}
                </span>
                <span className="sponsor-card-copy">
                  <strong>{sponsor.companyName}</strong>
                  <small>#{sponsor.rank}</small>
                </span>
                <strong className="sponsor-amount">{formatSponsorCardAmount(sponsor.bidCents)}</strong>
              </button>
              <button className="sponsor-card-action" type="button" onClick={() => setSponsorModalRank(sponsor.rank)}>Outbid #{sponsor.rank}</button>
            </div>
          ))}
        </aside>

        <h1 className="landing-title max-w-[34rem] text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-[2.85rem]">
          <MaskedText text="Transform your files," /><br /><MaskedText text="without the cloud." className="text-muted" />
        </h1>

        <div
          className={`drop-zone group relative mt-16 mx-auto w-full max-w-[40rem] cursor-pointer rounded-[2rem] px-5 py-14 text-center transition-all duration-300 hover:bg-panel/50 sm:px-8 sm:py-16 ${dragging ? "drop-zone-active" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Choose files to upload"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            workflow.addFiles(event.dataTransfer.files);
          }}
        >
          <p className="drop-zone-subtitle">
            Convert, compress, and edit files instantly. No servers. No accounts.
          </p>
        
          <span className="drop-upload-icon mx-auto flex size-16 items-center justify-center rounded-2xl shadow-lg text-foreground">
            <CloudArrowUp size={30} weight="light" />
          </span>
          <h2 className="mt-4 text-xl font-medium tracking-tight text-foreground">Drop your files right here</h2>
          <p className="mt-2 text-sm text-muted">or click anywhere to browse your device</p>
          <div className="drop-category-list mt-7 flex flex-wrap justify-center gap-2" aria-label="Supported file categories">
            {supportedCategories.map(([label, Icon]) => (
              <button type="button" key={label} className="drop-category" onClick={(event) => { event.stopPropagation(); browseCategory(label); }}>
                <Icon size={14} weight="duotone" color={categoryColors[label]} />{label}
              </button>
            ))}
          </div>
        </div>

        <p className="landing-privacy-note">
          100% local processing<span className="privacy-separator"> · </span><br className="privacy-mobile-break" />
          your files never leave your device
        </p>

        {sponsorModalRank !== null && (
          <SponsorModal sponsors={displaySponsors} initialRank={sponsorModalRank} onClose={() => setSponsorModalRank(null)} />
        )}

        {selectedSponsor && (
          <div
            className="sponsor-details-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSelectedSponsor(null);
            }}
          >
            <section className="sponsor-details-modal" role="dialog" aria-modal="true" aria-labelledby="sponsor-details-title">
              <button className="sponsor-details-close" type="button" aria-label="Close sponsor details" onClick={() => setSelectedSponsor(null)}>
                ×
              </button>
              <span
                className={`sponsor-details-mark ${selectedSponsor.logoUrl ? "has-sponsor-logo" : ""}`}
                style={sponsorMarkStyle(selectedSponsor.rank - 1, selectedSponsor.logoUrl)}
              >
                {!selectedSponsor.logoUrl && selectedSponsor.companyName.slice(0, 1)}
              </span>
              <p className="eyebrow">Sponsored placement · #{selectedSponsor.rank}</p>
              <h2 id="sponsor-details-title">{selectedSponsor.companyName}</h2>
              <p className="sponsor-details-category">{selectedSponsor.category}</p>
              <p className="sponsor-details-description">{selectedSponsor.description}</p>
              <div className="sponsor-details-actions">
                <a href={selectedSponsor.destinationUrl} target="_blank" rel="noreferrer noopener">Visit website ↗</a>
                <button type="button" onClick={() => { setSelectedSponsor(null); setSponsorModalRank(selectedSponsor.rank); }}>Outbid #{selectedSponsor.rank}</button>
              </div>
            </section>
          </div>
        )}
      </div>

      <section className="how-it-works" aria-labelledby="how-it-works-title">
        <div className="how-it-works-heading">
          <h2 id="how-it-works-title">How StayLokal works</h2>
          <p>Useful file tools, private processing, and a transparent sponsor leaderboard.</p>
        </div>

        <div className="how-it-works-grid">
          <article className="how-it-works-card">
            <span className="how-it-works-number">01</span>
            <h3>Drop your files</h3>
            <p>Drag or select files.</p>
          </article>
          <article className="how-it-works-card">
            <span className="how-it-works-number">02</span>
            <h3>Choose a tool</h3>
            <p>Process 100% locally.</p>
          </article>
          <article className="how-it-works-card">
            <span className="how-it-works-number">03</span>
            <h3>Download the result</h3>
            <p>Instant direct download.</p>
          </article>
        </div>

        <div className="bidding-explainer">
          <div className="bidding-explainer-content">
            <p className="eyebrow">Sponsor leaderboard</p>
            <h2>How bidding works</h2>
            <p>Five spots. Bid for a rank. Higher bids move up.</p>
          </div>
          <div className="bidding-explainer-steps">
            <ol>
              <li><strong>Choose a rank</strong><span>Pick the placement you want.</span></li>
              <li><strong>Outbid the current sponsor</strong><span>Pay the minimum shown for that position.</span></li>
              <li><strong>Go live after payment</strong><span>Payment activates your placement.</span></li>
            </ol>
            <Link className="rules-link" href="/rules">Read the full sponsor rules →</Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer" aria-label="StayLokal">
        <p className="landing-footer-line">
          <span className="landing-footer-brand">
            <Image alt="" aria-hidden="true" className="landing-footer-logo" height={26} src="/images/logo.png" width={30} />
            <strong>StayLokal</strong>
          </span>
          <span className="landing-footer-dot" aria-hidden="true">·</span>
          <span>Built from India for the world.</span>
          <span className="landing-footer-dot" aria-hidden="true">·</span>
          <span className="landing-footer-credit">
            <Image
              alt=""
              aria-hidden="true"
              className="landing-footer-avatar"
              height={22}
              src="/images/staylokal-founder.png"
              width={22}
            />
            <span>Built by</span>
            <a href="https://x.com/strykerin" rel="me noreferrer" target="_blank">@strykerin</a>
          </span>
        </p>
      </footer>
    </>
  );
}