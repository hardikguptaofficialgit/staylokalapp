"use client";

import Link from "next/link";
import Image from "next/image";
import { readJsonResponse } from "@/lib/app/fetch-json";
import { ArrowLeft, CheckCircle, CircleNotch, Heart, LockKey } from "@phosphor-icons/react";
import { applyTheme, resolveTheme, subscribeTheme, type Theme } from "@/lib/app/theme";
import ThemeToggle from "@/components/app/ThemeToggle";
import { firePaymentConfetti } from "@/lib/app/payment-confetti";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";

const MINIMUM_DONATION = 5;
type DonationReturnState = "none" | "verifying" | "verified" | "failed";

function readReturnPaymentId(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("payment_id")?.trim() || params.get("paymentId")?.trim() || null;
}

function clearDonationReturnParams() {
  const url = new URL(window.location.href);
  for (const key of ["payment_id", "paymentId", "status", "success", "email", "subscription_id"]) {
    url.searchParams.delete(key);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

export default function DonatePage() {
  const [amount, setAmount] = useState("5");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnPaymentId] = useState(readReturnPaymentId);
  const [donationReturn, setDonationReturn] = useState<DonationReturnState>(() => (
    returnPaymentId ? "verifying" : "none"
  ));
  const theme = useSyncExternalStore(subscribeTheme, resolveTheme, () => "dark" as Theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!returnPaymentId) return;

    const controller = new AbortController();
    const deadline = Date.now() + 60_000;
    const verify = async () => {
      while (!controller.signal.aborted && Date.now() < deadline) {
        try {
          const query = new URLSearchParams({ payment_id: returnPaymentId });
          const response = await fetch(`/api/donations/confirm?${query.toString()}`, {
            signal: controller.signal,
          });
          const result = await readJsonResponse<{ verified?: boolean; error?: string }>(response);
          if (result.verified) {
            setDonationReturn("verified");
            clearDonationReturnParams();
            firePaymentConfetti();
            return;
          }
          if (response.status === 202) {
            await new Promise((resolve) => window.setTimeout(resolve, 2000));
            continue;
          }
          setDonationReturn("failed");
          setError(result.error ?? "We could not verify this donation.");
          return;
        } catch (verifyError) {
          if (verifyError instanceof DOMException && verifyError.name === "AbortError") return;
          await new Promise((resolve) => window.setTimeout(resolve, 2000));
        }
      }
      if (!controller.signal.aborted) {
        setDonationReturn("failed");
        setError("Donation confirmation timed out. Refresh shortly if you completed checkout.");
      }
    };

    void verify();
    return () => controller.abort();
  }, [returnPaymentId]);

  const paymentComplete = donationReturn === "verified";
  const verifyingReturn = donationReturn === "verifying";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < MINIMUM_DONATION) {
      setError("Please enter a donation of at least $5.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/donations/checkout", {
        body: JSON.stringify({ amount: parsedAmount }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await readJsonResponse<{ checkoutUrl?: string; error?: string }>(response);
      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error ?? "Unable to start checkout.");
      }
      window.location.assign(result.checkoutUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to start checkout.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="donate-page">
      <header className="donate-header">
        <Link className="brand-pill" href="/">
          <Image src="/images/logo.png" alt="StayLokal" width={34} height={30} className="donate-brand-logo" priority />
          <span>StayLokal</span>
        </Link>
        <div className="donate-header-actions">
          <ThemeToggle />
          <Link className="donate-back-link" href="/">
            <ArrowLeft size={15} /> Back
          </Link>
        </div>
      </header>

      <section className="donate-card" aria-labelledby="donate-title">
        <div className="donate-icon"><Heart size={25} weight="fill" /></div>
        <p className="eyebrow">Support independent software</p>
        <h1 id="donate-title">Keep file tools local.</h1>
        <p className="donate-description">
          StayLokal is built to help you work with your files privately, directly in your browser.
          If it saves you time, you can support its continued development.
        </p>

        {verifyingReturn ? (
          <div className="donation-success" role="status">
            <CircleNotch className="sponsor-payment-spinner" size={28} />
            <h2>Confirming your donation…</h2>
            <p>Hang on while we verify your payment.</p>
          </div>
        ) : paymentComplete ? (
          <div className="donation-success" role="status">
            <CheckCircle size={28} weight="fill" />
            <h2>Thank you for supporting StayLokal.</h2>
            <p>Your contribution was received successfully.</p>
            <Link className="donation-success-link" href="/">Return to StayLokal</Link>
          </div>
        ) : <form className="donate-form" onSubmit={handleSubmit}>
          <label htmlFor="donation-amount">Choose an amount</label>
          <div className="donation-amount-field">
            <span>$</span>
            <input
              id="donation-amount"
              inputMode="decimal"
              min={MINIMUM_DONATION}
              name="amount"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="5.00"
              step="0.01"
              type="number"
              value={amount}
            />
            <span className="donation-currency">USD</span>
          </div>
          <p className="donation-hint">Any amount from $5 helps keep the project independent.</p>
          {error && <p className="donation-error" role="alert">{error}</p>}
          <button className="donation-submit" disabled={isSubmitting} type="submit">
            <Heart size={17} weight="fill" />
            {isSubmitting ? "Opening secure checkout…" : "Continue to checkout"}
          </button>
        </form>}

        <p className="donation-security"><LockKey size={14} /> Secure payment powered by Dodo Payments</p>
      </section>
    </main>
  );
}
