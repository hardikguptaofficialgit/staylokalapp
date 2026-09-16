"use client";

import { ArrowRight, CaretDown, Check, Tag, UploadSimple } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatBid, minimumBidForRank } from "@/lib/sponsors/ranking";
import { SPONSOR_CATEGORIES, type RankedSponsor } from "@/lib/sponsors/types";

type SponsorModalProps = {
  sponsors: RankedSponsor[];
  initialRank?: number;
  onClose: () => void;
};

const emptyForm = {
  companyName: "",
  destination: "",
  category: "",
  description: "",
  bid: "",
};

export default function SponsorModal({ sponsors, initialRank = 5, onClose }: SponsorModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [targetRank, setTargetRank] = useState(initialRank);
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoFileName, setLogoFileName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (categoryOpen) setCategoryOpen(false);
      else onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [categoryOpen, onClose]);

  const minimumBid = useMemo(
    () => minimumBidForRank(sponsors, targetRank),
    [sponsors, targetRank],
  );
  const currentSponsor = sponsors.find((sponsor) => sponsor.rank === targetRank);

  function updateForm(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function closeModal() {
    onClose();
    window.dispatchEvent(new Event("close-sponsor-modal"));
  }

  function selectRank(rank: number) {
    setTargetRank(rank);
    setForm((current) => ({ ...current, bid: (minimumBidForRank(sponsors, rank) / 100).toFixed(2) }));
  }

  function handleLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 512 * 1024) {
      setError("Use a PNG, JPEG, or WebP logo smaller than 512 KB.");
      return;
    }
    const reader = new FileReader();
    setLogoFileName(file.name);
    reader.onload = () => setLogoDataUrl(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  async function submitClaim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const bidCents = Math.round(Number(form.bid) * 100);
    if (!termsAccepted) {
      setError("Accept the sponsor terms to continue.");
      return;
    }
    if (!Number.isSafeInteger(bidCents) || bidCents < minimumBid) {
      setError(`This rank currently requires at least ${formatBid(minimumBid)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/sponsors/claim", {
        body: JSON.stringify({
          bidCents,
          category: form.category,
          companyName: form.companyName,
          description: form.description,
          destination: form.destination,
          logoDataUrl: logoDataUrl || undefined,
          targetRank,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error ?? "Unable to start checkout.");
      window.location.assign(result.checkoutUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to start checkout.");
      setIsSubmitting(false);
    }
  }

  return createPortal((
    <div className="sponsor-modal-backdrop" role="presentation" onMouseDown={(event) => {
      const target = event.target;
      if (target === event.currentTarget || (target instanceof Element && target.closest(".sponsor-modal-close"))) {
        closeModal();
      }
    }}>
      <section
        className="sponsor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sponsor-modal-title"
        onClickCapture={(event) => {
          if (event.target instanceof Element && event.target.closest(".sponsor-modal-close")) {
            closeModal();
          }
        }}
      >
        <button
          aria-label="Close sponsor form"
          className="sponsor-modal-close"
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={closeModal}
          onClick={(event) => {
            event.stopPropagation();
            closeModal();
          }}
        >
          Close
        </button>
        <p className="eyebrow">Limited sponsored positions</p>
        <h2 id="sponsor-modal-title">Claim a sponsor position.</h2>
        <p className="sponsor-modal-intro">Choose a rank, add your listing, and continue to checkout.</p>

        <div className="sponsor-rank-picker" aria-label="Choose a sponsor rank">
          {Array.from({ length: 5 }, (_, index) => index + 1).map((rank) => {
            const sponsor = sponsors.find((item) => item.rank === rank);
            const minimum = minimumBidForRank(sponsors, rank);
            return (
              <button
                className={`sponsor-rank-option ${targetRank === rank ? "is-selected" : ""}`}
                key={rank}
                type="button"
                onClick={() => selectRank(rank)}
              >
                <span>#{rank}</span>
                <small>{sponsor ? formatBid(sponsor.bidCents) : formatBid(minimum)}</small>
              </button>
            );
          })}
        </div>
        <p className="sponsor-rank-status">
          #{targetRank} · {currentSponsor ? `${currentSponsor.companyName} · ` : "Open · "}from <strong>{formatBid(minimumBid)}</strong>
        </p>

        <form className="sponsor-form" onSubmit={submitClaim}>
          <label>Company name<input required maxLength={80} value={form.companyName} onChange={(event) => updateForm("companyName", event.target.value)} placeholder="Your company" /></label>
          <label>Website or @handle<input required maxLength={300} value={form.destination} onChange={(event) => updateForm("destination", event.target.value)} placeholder="https://example.com" /></label>
          <label className="sponsor-category-field">Category
            <span className="sponsor-category-select">
              <button
                aria-expanded={categoryOpen}
                aria-haspopup="listbox"
                className={`sponsor-category-trigger ${form.category ? "has-value" : ""}`}
                type="button"
                onClick={() => setCategoryOpen((open) => !open)}
              >
                <Tag size={15} />
                <span>{form.category || "Choose a category"}</span>
                <CaretDown className={categoryOpen ? "is-open" : ""} size={15} />
              </button>
              {categoryOpen && (
                <span className="sponsor-category-menu" role="listbox" aria-label="Sponsor categories">
                  {SPONSOR_CATEGORIES.map((category) => (
                    <button
                      aria-selected={form.category === category}
                      className="sponsor-category-option"
                      key={category}
                      role="option"
                      type="button"
                      onClick={() => {
                        updateForm("category", category);
                        setCategoryOpen(false);
                      }}
                    >
                      <Tag size={14} />
                      <span>{category}</span>
                      {form.category === category && <Check className="is-selected" size={14} />}
                    </button>
                  ))}
                </span>
              )}
            </span>
          </label>
          <label>Description<input required maxLength={160} value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="One short sentence" /></label>
          <label className="sponsor-logo-upload">Logo <span>optional</span>
            <span className="sponsor-logo-dropzone">
              <span
                aria-hidden="true"
                className="sponsor-logo-preview"
                style={logoDataUrl ? { backgroundImage: `url(${logoDataUrl})` } : undefined}
              >
                {!logoDataUrl && <UploadSimple size={18} />}
              </span>
              <span className="sponsor-logo-copy">
                <strong>{logoFileName || "Upload a logo"}</strong>
                <small>{logoFileName ? "Logo ready" : "PNG, JPEG, or WebP · max 512 KB"}</small>
              </span>
              <input
                accept="image/png,image/jpeg,image/webp"
                id="sponsor-logo"
                type="file"
                onChange={handleLogo}
              />
            </span>
          </label>
          <label className="sponsor-bid-label">Your bid <span>{formatBid(Math.max(minimumBid, Math.round(Number(form.bid || 0) * 100)))}</span><input required min={minimumBid / 100} step="0.01" type="number" value={form.bid} onChange={(event) => updateForm("bid", event.target.value)} /></label>
          <label className="sponsor-terms"><input checked={termsAccepted} type="checkbox" onChange={(event) => setTermsAccepted(event.target.checked)} /> I agree to the one-time sponsor payment.</label>
          {error && <p className="sponsor-form-error" role="alert">{error}</p>}
          <button className="sponsor-submit" disabled={isSubmitting} type="submit">{isSubmitting ? "Opening checkout…" : "Continue to checkout"}<ArrowRight size={17} /></button>
        </form>
      </section>
    </div>
  ), document.body);
}
