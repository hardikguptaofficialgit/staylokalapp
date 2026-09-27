"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CheckCircle, CircleNotch, X } from "@phosphor-icons/react";
import { readJsonResponse } from "@/lib/app/fetch-json";

type State = "idle" | "confirming" | "success" | "error";

const POLL_MS = 2_000;
const TIMEOUT_MS = 60_000;
const MAX_TRANSIENT_RETRIES = 8;
const CLAIM_STORAGE_KEY = "staylokal-sponsor-claim-id";
const CONFIRM_MESSAGE = "Payment received. Activating your sponsor placement…";

type SponsorReturn = {
  active: boolean;
  claimId: string | null;
  paymentId: string | null;
  status: string | null;
};

const subscribeToLocation = (callback: () => void) => {
  const onChange = () => callback();
  window.addEventListener("popstate", onChange);
  const timer = window.setTimeout(onChange, 0);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("popstate", onChange);
  };
};

const inactiveSponsorReturn: SponsorReturn = {
  active: false,
  claimId: null,
  paymentId: null,
  status: null,
};

const getServerSponsorReturn = () => inactiveSponsorReturn;

let cachedActiveReturn: SponsorReturn | null = null;
let cachedActiveReturnKey = "";

function activeReturnKey(paymentId: string | null, claimId: string | null, status: string | null) {
  return `${paymentId ?? ""}\0${claimId ?? ""}\0${status ?? ""}`;
}

const readSponsorReturn = (): SponsorReturn => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("sponsor") !== "success") {
    cachedActiveReturn = null;
    cachedActiveReturnKey = "";
    return inactiveSponsorReturn;
  }
  const paymentId = params.get("payment_id")?.trim() || params.get("paymentId")?.trim() || null;
  const claimId = params.get("claim_id")?.trim()
    || window.sessionStorage.getItem(CLAIM_STORAGE_KEY)?.trim()
    || null;
  const status = params.get("status")?.trim() || null;
  const key = activeReturnKey(paymentId, claimId, status);
  if (cachedActiveReturn && cachedActiveReturnKey === key) {
    return cachedActiveReturn;
  }
  cachedActiveReturnKey = key;
  cachedActiveReturn = { active: true, claimId, paymentId, status };
  return cachedActiveReturn;
};

function sponsorReturnError(sponsorReturn: SponsorReturn): string | null {
  if (!sponsorReturn.active) return null;
  const status = sponsorReturn.status?.toLowerCase();
  if (status && status !== "succeeded" && status !== "success") {
    return "This payment did not complete, so your sponsor placement was not activated.";
  }
  if (!sponsorReturn.paymentId && !sponsorReturn.claimId) {
    return "The payment return was incomplete. Check your payment provider or contact support.";
  }
  return null;
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function clearSponsorReturnState() {
  window.sessionStorage.removeItem(CLAIM_STORAGE_KEY);
  const url = new URL(window.location.href);
  for (const key of ["sponsor", "payment_id", "paymentId", "claim_id", "status", "email", "subscription_id"]) {
    url.searchParams.delete(key);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
  cachedActiveReturn = null;
  cachedActiveReturnKey = "";
  window.dispatchEvent(new Event("popstate"));
}

async function requestConfirmation(target: { paymentId?: string; claimId?: string }, signal: AbortSignal) {
  const query = new URLSearchParams();
  if (target.paymentId) query.set("payment_id", target.paymentId);
  if (target.claimId) query.set("claim_id", target.claimId);
  const response = await fetch(`/api/sponsors/confirm?${query.toString()}`, { signal });
  let result: { activated?: boolean; error?: string } = {};
  try {
    result = await readJsonResponse<{ activated?: boolean; error?: string }>(response);
  } catch {
    result = {};
  }
  return { response, result };
}

export default function SponsorPaymentStatus() {
  const sponsorReturn = useSyncExternalStore(subscribeToLocation, readSponsorReturn, getServerSponsorReturn);
  const returnError = useMemo(() => sponsorReturnError(sponsorReturn), [sponsorReturn]);
  const confirmTarget = useMemo(() => {
    if (!sponsorReturn.active || returnError) return null;
    if (sponsorReturn.paymentId || sponsorReturn.claimId) {
      return {
        paymentId: sponsorReturn.paymentId ?? undefined,
        claimId: sponsorReturn.claimId ?? undefined,
      };
    }
    return null;
  }, [returnError, sponsorReturn.active, sponsorReturn.claimId, sponsorReturn.paymentId]);

  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    if (state === "success") clearSponsorReturnState();
  }, [state]);

  useEffect(() => {
    if (!confirmTarget) return;

    const controller = new AbortController();
    const { signal } = controller;
    let finished = false;

    const run = async () => {
      const deadline = Date.now() + TIMEOUT_MS;
      let transientRetries = 0;

      while (!finished && !signal.aborted && Date.now() < deadline) {
        try {
          const { response, result } = await requestConfirmation(confirmTarget, signal);
          if (result.activated) {
            finished = true;
            setState("success");
            setMessage("Your sponsor placement is now live in the StayLokal leaderboard.");
            window.sessionStorage.removeItem(CLAIM_STORAGE_KEY);
            window.dispatchEvent(new Event("sponsor-leaderboard-refresh"));
            return;
          }
          if (response.status === 409 || response.status === 503) {
            finished = true;
            setState("error");
            setMessage(result.error ?? "Sponsor activation could not be confirmed.");
            return;
          }
          if (response.status === 202) {
            if (result.error) setMessage(result.error);
            await sleep(POLL_MS, signal);
            continue;
          }
          if (response.status === 502 || response.status >= 500) {
            transientRetries += 1;
            if (result.error) setMessage(result.error);
            if (transientRetries >= MAX_TRANSIENT_RETRIES) {
              finished = true;
              setState("error");
              setMessage(result.error ?? "Payment verification is temporarily unavailable. Refresh shortly.");
              return;
            }
            await sleep(POLL_MS, signal);
            continue;
          }
          finished = true;
          setState("error");
          setMessage(result.error ?? "Sponsor activation could not be confirmed.");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          await sleep(POLL_MS, signal).catch(() => undefined);
        }
      }

      if (!finished && !signal.aborted) {
        setState("error");
        setMessage("Payment confirmation timed out. Please refresh shortly or contact support.");
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [confirmTarget]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [closeModal, isOpen]);

  if (!sponsorReturn.active || !isOpen) return null;

  const uiState: State = returnError ? "error" : state === "idle" ? "confirming" : state;
  const isSuccess = uiState === "success";
  const isLoading = uiState === "confirming";
  const title = isSuccess
    ? "You’re officially a sponsor."
    : isLoading
      ? "Payment received."
      : "Payment needs confirmation.";
  const detail = returnError
    ?? (isSuccess
      ? message || "Your sponsor placement is now live in the StayLokal leaderboard."
      : message || CONFIRM_MESSAGE);

  return (
    <div
      className="sponsor-payment-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <section
        aria-labelledby="sponsor-payment-title"
        aria-modal="true"
        className={`sponsor-payment-modal sponsor-payment-modal-${isSuccess ? "success" : isLoading ? "confirming" : uiState}`}
        role="dialog"
      >
        <button
          aria-label="Close payment confirmation"
          className="sponsor-payment-modal-close"
          type="button"
          onClick={closeModal}
        >
          <X size={18} />
        </button>
        <div className="sponsor-payment-modal-icon" aria-hidden="true">
          {isSuccess ? (
            <CheckCircle size={30} weight="fill" />
          ) : (
            <CircleNotch className={isLoading ? "sponsor-payment-spinner" : undefined} size={28} />
          )}
        </div>
        <p className="eyebrow">Sponsor payment</p>
        <h2 id="sponsor-payment-title">{title}</h2>
        <p>{detail}</p>
        {isSuccess && <p className="sponsor-payment-modal-note">Thank you for supporting private, local-first file tools.</p>}
        <button className="sponsor-payment-modal-action" type="button" onClick={closeModal}>
          Continue to StayLokal
        </button>
      </section>
    </div>
  );
}
