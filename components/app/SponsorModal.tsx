"use client";

import { ArrowRight, CaretDown, Check, Tag, UploadSimple, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isDodoCheckoutUrl } from "@/lib/app/checkout-url";
import { readJsonResponse } from "@/lib/app/fetch-json";
import {
  computeSponsorCheckoutAmounts,
  findActiveSponsorByDestination,
  parseSponsorDestinationInput,
} from "@/lib/sponsors/sponsor-identity";
import { formatBid, minimumBidForRank } from "@/lib/sponsors/ranking";
import { SPONSOR_CATEGORIES, type RankedSponsor } from "@/lib/sponsors/types";
import SponsorStackPreview from "./SponsorStackPreview";

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

type CropRect = { x: number; y: number; size: number };
type CropFrame = { x: number; y: number; width: number; height: number; scale: number };

function SponsorLogoCropper({
  source,
  onCancel,
  onApply,
}: {
  source: string;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const interactionRef = useRef<{ mode: "move" | "resize"; corner?: string; startX: number; startY: number; rect: CropRect } | null>(null);
  const [frame, setFrame] = useState<CropFrame | null>(null);
  const [rect, setRect] = useState<CropRect | null>(null);
  const [initialRect, setInitialRect] = useState<CropRect | null>(null);
  const canvasWidth = 640;
  const canvasHeight = 420;

  useEffect(() => {
    const image = new window.Image();
    image.onload = () => {
      const scale = Math.min(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const nextFrame = { x: (canvasWidth - width) / 2, y: (canvasHeight - height) / 2, width, height, scale };
      const size = Math.min(width, height) * 0.72;
      const nextRect = { x: nextFrame.x + (width - size) / 2, y: nextFrame.y + (height - size) / 2, size };
      setFrame(nextFrame);
      setRect(nextRect);
      setInitialRect(nextRect);
      imageRef.current = image;
    };
    image.src = source;
  }, [source]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !frame || !rect) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(image, frame.x, frame.y, frame.width, frame.height);
    context.fillStyle = "rgba(0, 0, 0, 0.58)";
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.clearRect(rect.x, rect.y, rect.size, rect.size);
    context.drawImage(
      image,
      (rect.x - frame.x) / frame.scale,
      (rect.y - frame.y) / frame.scale,
      rect.size / frame.scale,
      rect.size / frame.scale,
      rect.x,
      rect.y,
      rect.size,
      rect.size,
    );
    context.strokeStyle = "rgba(255, 255, 255, 0.34)";
    context.lineWidth = 1;
    for (const fraction of [1 / 3, 2 / 3]) {
      context.beginPath();
      context.moveTo(rect.x + rect.size * fraction, rect.y);
      context.lineTo(rect.x + rect.size * fraction, rect.y + rect.size);
      context.stroke();
      context.beginPath();
      context.moveTo(rect.x, rect.y + rect.size * fraction);
      context.lineTo(rect.x + rect.size, rect.y + rect.size * fraction);
      context.stroke();
    }
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.strokeRect(rect.x, rect.y, rect.size, rect.size);
    context.fillStyle = "#ffffff";
    const handlePoints = [
      [rect.x, rect.y], [rect.x + rect.size / 2, rect.y], [rect.x + rect.size, rect.y],
      [rect.x + rect.size, rect.y + rect.size / 2], [rect.x + rect.size, rect.y + rect.size],
      [rect.x + rect.size / 2, rect.y + rect.size], [rect.x, rect.y + rect.size],
      [rect.x, rect.y + rect.size / 2],
    ];
    for (const [x, y] of handlePoints) {
      context.fillRect(x - 6, y - 6, 12, 12);
    }
  }, [frame, rect]);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvasWidth,
      y: ((event.clientY - bounds.top) / bounds.height) * canvasHeight,
    };
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!rect || !frame) return;
    const point = canvasPoint(event);
    const handles = [
      ["nw", rect.x, rect.y],
      ["n", rect.x + rect.size / 2, rect.y],
      ["ne", rect.x + rect.size, rect.y],
      ["e", rect.x + rect.size, rect.y + rect.size / 2],
      ["se", rect.x + rect.size, rect.y + rect.size],
      ["s", rect.x + rect.size / 2, rect.y + rect.size],
      ["sw", rect.x, rect.y + rect.size],
      ["w", rect.x, rect.y + rect.size / 2],
    ] as const;
    const handle = handles.find(([, x, y]) => Math.hypot(point.x - x, point.y - y) < 20)?.[0];
    if (!handle && (point.x < rect.x || point.x > rect.x + rect.size || point.y < rect.y || point.y > rect.y + rect.size)) return;
    interactionRef.current = { mode: handle ? "resize" : "move", corner: handle, startX: point.x, startY: point.y, rect };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const interaction = interactionRef.current;
    if (!interaction || !frame) return;
    const point = canvasPoint(event);
    const dx = point.x - interaction.startX;
    const dy = point.y - interaction.startY;
    let next = interaction.rect;
    if (interaction.mode === "move") {
      next = {
        ...next,
        x: Math.max(frame.x, Math.min(frame.x + frame.width - next.size, next.x + dx)),
        y: Math.max(frame.y, Math.min(frame.y + frame.height - next.size, next.y + dy)),
      };
    } else {
      const handle = interaction.corner ?? "se";
      const maxSize = Math.min(frame.width, frame.height);
      let anchorX = interaction.rect.x;
      let anchorY = interaction.rect.y;
      let size = interaction.rect.size;
      if (handle === "n") {
        anchorX = interaction.rect.x + interaction.rect.size / 2;
        anchorY = interaction.rect.y + interaction.rect.size;
        size = Math.abs(anchorY - point.y);
        next = { size, x: anchorX - size / 2, y: anchorY - size };
      } else if (handle === "s") {
        anchorX = interaction.rect.x + interaction.rect.size / 2;
        anchorY = interaction.rect.y;
        size = Math.abs(point.y - anchorY);
        next = { size, x: anchorX - size / 2, y: anchorY };
      } else if (handle === "w") {
        anchorX = interaction.rect.x + interaction.rect.size;
        anchorY = interaction.rect.y + interaction.rect.size / 2;
        size = Math.abs(anchorX - point.x);
        next = { size, x: anchorX - size, y: anchorY - size / 2 };
      } else if (handle === "e") {
        anchorX = interaction.rect.x;
        anchorY = interaction.rect.y + interaction.rect.size / 2;
        size = Math.abs(point.x - anchorX);
        next = { size, x: anchorX, y: anchorY - size / 2 };
      } else {
        anchorX = handle.includes("w") ? interaction.rect.x + interaction.rect.size : interaction.rect.x;
        anchorY = handle.includes("n") ? interaction.rect.y + interaction.rect.size : interaction.rect.y;
        const directionX = handle.includes("w") ? -1 : 1;
        const directionY = handle.includes("n") ? -1 : 1;
        size = Math.max(80, Math.min(maxSize, Math.max(Math.abs(point.x - anchorX), Math.abs(point.y - anchorY))));
        next = { size, x: anchorX - (directionX < 0 ? size : 0), y: anchorY - (directionY < 0 ? size : 0) };
      }
      size = Math.max(80, Math.min(maxSize, size));
      next = {
        size,
        x: Math.max(frame.x, Math.min(frame.x + frame.width - size, next.x)),
        y: Math.max(frame.y, Math.min(frame.y + frame.height - size, next.y)),
      };
    }
    setRect(next);
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    interactionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function applyCrop() {
    if (!frame || !rect || !imageRef.current) return;
    const output = document.createElement("canvas");
    output.width = 512;
    output.height = 512;
    const context = output.getContext("2d");
    if (!context) return;
    context.drawImage(
      imageRef.current,
      (rect.x - frame.x) / frame.scale,
      (rect.y - frame.y) / frame.scale,
      rect.size / frame.scale,
      rect.size / frame.scale,
      0,
      0,
      512,
      512,
    );
    onApply(output.toDataURL("image/webp", 0.9));
  }

  return (
    <div className="sponsor-crop-backdrop" role="presentation" onMouseDown={(event) => event.stopPropagation()}>
      <section className="sponsor-crop-modal" role="dialog" aria-modal="true" aria-labelledby="sponsor-crop-title">
        <canvas
          aria-label="Drag the crop area or resize it using the corner handles"
          className="sponsor-crop-canvas"
          height={canvasHeight}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          ref={canvasRef}
          width={canvasWidth}
        />
        <div className="sponsor-crop-content">
          <h2 id="sponsor-crop-title">Crop logo</h2>
          <p className="sponsor-crop-hint">Drag or resize the square.</p>
          <div className="sponsor-crop-meta">
            <span>{frame && rect ? `${Math.round(rect.size / frame.scale)}px square` : "Loading…"}</span>
          </div>
          <div className="sponsor-crop-actions">
            <button type="button" onClick={() => initialRect && setRect(initialRect)}>Reset</button>
            <button type="button" onClick={onCancel}>Cancel</button>
            <button className="sponsor-crop-apply" type="button" onClick={applyCrop}>Use logo</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SponsorModal({ sponsors, initialRank = 5, onClose }: SponsorModalProps) {
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    bid: (minimumBidForRank(sponsors, initialRank) / 100).toFixed(2),
  }));
  const [targetRank, setTargetRank] = useState(initialRank);
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoFileName, setLogoFileName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [cropSource, setCropSource] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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
  const previewBidCents = useMemo(() => {
    const parsed = Math.round(Number(form.bid) * 100);
    if (Number.isSafeInteger(parsed) && parsed >= minimumBid) return parsed;
    return minimumBid;
  }, [form.bid, minimumBid]);

  const existingListing = useMemo(() => {
    const parsed = parseSponsorDestinationInput(form.destination);
    if (!parsed) return null;
    return findActiveSponsorByDestination(sponsors, parsed.destinationUrl, parsed.handle);
  }, [form.destination, sponsors]);

  const upgradeCheckout = useMemo(() => {
    const parsed = parseSponsorDestinationInput(form.destination);
    if (!parsed || !existingListing) return null;
    return computeSponsorCheckoutAmounts(sponsors, {
      bidCents: previewBidCents,
      destinationUrl: parsed.destinationUrl,
      handle: parsed.handle,
    });
  }, [existingListing, form.destination, previewBidCents, sponsors]);

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
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setCropSource(reader.result);
    };
    reader.readAsDataURL(file);
  }


  async function submitClaim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    const bidCents = previewBidCents;
    if (!termsAccepted) {
      setError("Accept the sponsor terms to continue.");
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
      const result = await readJsonResponse<{
        checkoutUrl?: string;
        claimId?: string;
        error?: string;
        minimumBidCents?: number;
      }>(response);
      if (response.status === 409 && result.minimumBidCents) {
        const nextBid = (result.minimumBidCents / 100).toFixed(2);
        setForm((current) => ({ ...current, bid: nextBid }));
        window.dispatchEvent(new Event("sponsor-leaderboard-refresh"));
        throw new Error(result.error ?? `This rank now requires at least ${formatBid(result.minimumBidCents)}.`);
      }
      if (!response.ok || !result.checkoutUrl || !isDodoCheckoutUrl(result.checkoutUrl)) {
        throw new Error(result.error ?? "Unable to start checkout.");
      }
      if (result.claimId) {
        window.sessionStorage.setItem("staylokal-sponsor-claim-id", result.claimId);
      }
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
        style={{
          maxHeight: "calc(100dvh - 16px)",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
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
          <X size={16} weight="bold" aria-hidden />
        </button>
        <style>{`
          @media (max-width: 720px) {
            .sponsor-modal {
              max-height: calc(100dvh - 12px) !important;
              overflow-y: auto !important;
              overflow-x: hidden !important;
              -webkit-overflow-scrolling: touch;
              overscroll-behavior: contain;
            }

            .sponsor-modal-content {
              min-height: 0 !important;
            }
          }
        `}</style>
        <SponsorStackPreview
          sponsors={sponsors}
          targetRank={targetRank}
          companyName={form.companyName}
          description={form.description}
          logoDataUrl={logoDataUrl}
          bidCents={previewBidCents}
        />
        <div className="sponsor-modal-content">
          <header className="sponsor-modal-header">
            <h2 id="sponsor-modal-title">Sponsor a spot</h2>
            <p className="sponsor-modal-intro">
              Pick a rank, fill the basics, checkout. India: UPI and cards at Dodo when you pay in INR.
            </p>
          </header>

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
            #{targetRank} · {currentSponsor ? currentSponsor.companyName : "Open"} · min <strong>{formatBid(minimumBid)}</strong>
          </p>

          <form className="sponsor-form" onSubmit={submitClaim}>
          <label>Name<input required maxLength={80} value={form.companyName} onChange={(event) => updateForm("companyName", event.target.value)} placeholder="Company or creator" /></label>
          <label>Link<input required maxLength={300} value={form.destination} onChange={(event) => updateForm("destination", event.target.value)} placeholder="site.com or @you" /></label>
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
                <span>{form.category || "Category"}</span>
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
          <label className="sponsor-tagline-field">Tagline<input required maxLength={160} value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="What you do in one line" /></label>
          <label className="sponsor-logo-upload">Logo <span>optional</span>
            <span className="sponsor-logo-dropzone">
              <span
                aria-hidden="true"
                className="sponsor-logo-preview"
                style={logoDataUrl ? { backgroundImage: `url(${logoDataUrl})` } : undefined}
              >
                {!logoDataUrl && <UploadSimple size={16} />}
              </span>
              <span className="sponsor-logo-copy">
                <strong>{logoFileName || "Add logo"}</strong>
                <small>{logoFileName ? "Ready" : "PNG · JPG · WebP"}</small>
              </span>
              <input
                accept="image/png,image/jpeg,image/webp"
                id="sponsor-logo"
                type="file"
                onChange={handleLogo}
              />
            </span>
          </label>
          <label className="sponsor-bid-label">Total bid <span>{formatBid(Math.max(minimumBid, Math.round(Number(form.bid || 0) * 100)))}</span><input required min={minimumBid / 100} step="0.01" type="number" value={form.bid} onChange={(event) => updateForm("bid", event.target.value)} /></label>
          {existingListing && upgradeCheckout && !("error" in upgradeCheckout) && (
            <p className="sponsor-upgrade-hint">
              Same link as your current listing ({formatBid(existingListing.bidCents)}). Pay{" "}
              <strong>{formatBid(upgradeCheckout.chargeCents)}</strong> now to move your total to{" "}
              {formatBid(upgradeCheckout.totalBidCents)}.
            </p>
          )}
          <label className="sponsor-terms"><input checked={termsAccepted} type="checkbox" onChange={(event) => setTermsAccepted(event.target.checked)} /> One-time payment — I&apos;m good with that.</label>
          {error && <p className="sponsor-form-error" role="alert">{error}</p>}
          <button className="sponsor-submit" disabled={isSubmitting} type="submit">{isSubmitting ? "Heading to checkout…" : "Checkout"}<ArrowRight size={17} weight="bold" /></button>
          </form>
        </div>
      </section>
      {cropSource && (
        <SponsorLogoCropper
          source={cropSource}
          onApply={(croppedLogo) => {
            setLogoDataUrl(croppedLogo);
            setCropSource("");
          }}
          onCancel={() => setCropSource("")}
        />
      )}
    </div>
  ), document.body);
}
