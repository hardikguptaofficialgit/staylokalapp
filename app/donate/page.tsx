"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle, Heart, LockKey, Moon, Sun } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";

const MINIMUM_DONATION = 5;

export default function DonatePage() {
  const [amount, setAmount] = useState("5");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentComplete] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("success") === "1" || params.get("status") === "succeeded";
  });
  const [isLight, setIsLight] = useState(() => (
    typeof document !== "undefined" && document.documentElement.dataset.theme === "light"
  ));

  function toggleTheme() {
    const nextTheme = isLight ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    setIsLight(!isLight);
  }

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
      const result = (await response.json()) as { checkoutUrl?: string; error?: string };
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
          <button className="control-pill theme-toggle" onClick={toggleTheme} aria-label="Toggle color mode" type="button">
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
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

        {paymentComplete ? (
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
