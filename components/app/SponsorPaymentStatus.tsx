"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CheckCircle, CircleNotch, X } from "@phosphor-icons/react";

type State = "idle" | "confirming" | "success" | "pending" | "error";

const subscribeToLocation = (callback: () => void) => {
  const timer = window.setTimeout(callback, 0);
  return () => window.clearTimeout(timer);
};
const serverPaymentId = () => "";
const currentSponsorReturn = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("sponsor") !== "success") return "";
  return params.get("payment_id")?.trim() || "missing";
};

export default function SponsorPaymentStatus() {
  const sponsorReturn = useSyncExternalStore(subscribeToLocation, currentSponsorReturn, serverPaymentId);
  const paymentId = sponsorReturn && sponsorReturn !== "missing" ? sponsorReturn : null;
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const confirmedPayment = useRef<string | null>(null);

  useEffect(() => {
    if (!paymentId || confirmedPayment.current === paymentId) return;
    confirmedPayment.current = paymentId;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setState("error");
      setMessage("Payment confirmation timed out. Please refresh shortly or contact support.");
      controller.abort();
    }, 15_000);
    fetch(`/api/sponsors/confirm?payment_id=${encodeURIComponent(paymentId)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as { activated?: boolean; error?: string };
        if (result.activated) {
          setState("success");
          window.dispatchEvent(new Event("sponsor-leaderboard-refresh"));
        } else if (response.status === 202) {
          setState("pending");
          setMessage(result.error ?? "Payment received. Sponsor activation is pending.");
        } else {
          throw new Error(result.error ?? "Sponsor activation could not be confirmed.");
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
        setMessage(error instanceof Error ? error.message : "Sponsor activation could not be confirmed.");
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [paymentId]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const missingPaymentId = sponsorReturn === "missing";
  const visibleState = missingPaymentId ? "error" : paymentId && state === "idle" ? "confirming" : state;
  const visibleMessage = missingPaymentId
    ? "The payment return was incomplete. Check your payment provider or contact support."
    : paymentId && state === "idle"
      ? "Payment received. Activating your sponsor placement…"
      : message;
  if (visibleState === "idle" || !isOpen) return null;
  const isSuccess = visibleState === "success";
  const title = isSuccess
    ? "You’re officially a sponsor."
    : visibleState === "confirming"
      ? "Payment received."
      : visibleState === "pending"
        ? "Payment received."
        : "Payment needs confirmation.";
  const detail = isSuccess
    ? "Your sponsor placement is now live in the StayLokal leaderboard."
    : visibleMessage;
  return (
    <div
      className="sponsor-payment-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsOpen(false);
      }}
    >
      <section
        aria-labelledby="sponsor-payment-title"
        aria-modal="true"
        className={`sponsor-payment-modal sponsor-payment-modal-${visibleState}`}
        role="dialog"
      >
        <button
          aria-label="Close payment confirmation"
          className="sponsor-payment-modal-close"
          type="button"
          onClick={() => setIsOpen(false)}
        >
          <X size={18} />
        </button>
        <div className="sponsor-payment-modal-icon" aria-hidden="true">
          {isSuccess ? <CheckCircle size={30} weight="fill" /> : <CircleNotch className={visibleState === "confirming" ? "sponsor-payment-spinner" : undefined} size={28} />}
        </div>
        <p className="eyebrow">Sponsor payment</p>
        <h2 id="sponsor-payment-title">{title}</h2>
        <p>{detail}</p>
        {isSuccess && <p className="sponsor-payment-modal-note">Thank you for supporting private, local-first file tools.</p>}
        <button className="sponsor-payment-modal-action" type="button" onClick={() => setIsOpen(false)}>
          Continue to StayLokal
        </button>
      </section>
    </div>
  );
}
