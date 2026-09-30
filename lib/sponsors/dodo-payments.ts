import "server-only";

import DodoPayments from "dodopayments";
import { normalizeBidCents } from "./ranking";

export type DodoPaymentSnapshot = {
  amount?: number;
  currency?: string | null;
  metadata?: Record<string, string | number | boolean | undefined>;
  status?: string | null;
  tax?: number | null;
  total_amount?: number;
};

export function createDodoClient() {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error("Dodo Payments is not configured.");
  }
  const environmentFlag = process.env.DODO_PAYMENTS_ENVIRONMENT ?? process.env.DODO_PAYMENTS_TEST_MODE;
  const environment = environmentFlag === "test_mode" || environmentFlag === "true"
    ? "test_mode"
    : "live_mode";

  return new DodoPayments({
    bearerToken: apiKey,
    environment,
  });
}

export function paymentAmountCents(payment: DodoPaymentSnapshot): number | null {
  const raw = payment.total_amount ?? payment.amount;
  return typeof raw === "number" && Number.isSafeInteger(raw) ? raw : null;
}

/** Sponsor bid before tax; Dodo `total_amount` includes tax when `tax` is set. */
export function paymentBidCents(payment: DodoPaymentSnapshot): number | null {
  const total = paymentAmountCents(payment);
  if (total === null) return null;
  const tax = typeof payment.tax === "number" && Number.isSafeInteger(payment.tax) ? payment.tax : 0;
  const subtotal = total - tax;
  if (!Number.isSafeInteger(subtotal) || subtotal < 0) return null;
  return subtotal;
}

function metadataUsdDollarsField(
  metadata?: DodoPaymentSnapshot["metadata"],
  field: "bid" | "charge" = "bid",
): number | null {
  const raw = metadata?.[field];
  if (typeof raw !== "string") return null;
  const match = /^\$(\d+(?:\.\d{2})?)$/.exec(raw.trim());
  if (!match) return null;
  const dollars = Number.parseFloat(match[1]);
  if (!Number.isFinite(dollars)) return null;
  const cents = Math.round(dollars * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function metadataBidCents(metadata?: DodoPaymentSnapshot["metadata"]): number | null {
  return metadataUsdDollarsField(metadata, "bid");
}

export function metadataChargeCents(metadata?: DodoPaymentSnapshot["metadata"]): number | null {
  return metadataUsdDollarsField(metadata, "charge");
}

function metadataIntegerCents(
  metadata?: DodoPaymentSnapshot["metadata"],
  field = "charge_usd_cents",
): number | null {
  const raw = metadata?.[field];
  if (raw === undefined || raw === null) return null;
  const cents = Number(String(raw).trim());
  return Number.isSafeInteger(cents) ? cents : null;
}

/** USD charge for sponsor checkout (Adaptive Currency may settle in INR, etc.). */
export function resolvedSponsorPaidChargeCents(payment: DodoPaymentSnapshot): number | null {
  const explicit = metadataIntegerCents(payment.metadata, "charge_usd_cents");
  if (explicit !== null) return explicit;

  const fromCharge = metadataChargeCents(payment.metadata);
  if (fromCharge !== null) return fromCharge;

  const currency = String(payment.currency ?? "USD").trim().toUpperCase();
  const paymentCents = paymentBidCents(payment);
  if (paymentCents !== null && currency === "USD") {
    return paymentCents;
  }

  const fromBid = metadataBidCents(payment.metadata);
  if (fromBid !== null) return fromBid;

  return null;
}

/** @deprecated Use resolvedSponsorPaidChargeCents */
export function resolvedSponsorBidCents(payment: DodoPaymentSnapshot): number | null {
  return resolvedSponsorPaidChargeCents(payment);
}

export function dodoApiErrorStatus(error: unknown): number | undefined {
  const status = (error as { status?: number })?.status;
  return typeof status === "number" ? status : undefined;
}

export function isRetryableDodoLookupError(error: unknown): boolean {
  const status = dodoApiErrorStatus(error);
  if (status === undefined) return true;
  return status >= 500 || status === 408 || status === 429;
}

export function claimBidCents(claimData: Record<string, unknown>): number | null {
  return normalizeBidCents(claimData.bidCents);
}

/** @deprecated Use expectedSponsorChargeCents with active sponsors at verification time. */
export function claimChargeCents(claimData: Record<string, unknown>): number | null {
  const totalBid = claimBidCents(claimData);
  if (totalBid === null) return null;
  const charge = normalizeBidCents(claimData.chargeCents);
  if (charge !== null && charge >= 1) return charge;
  return totalBid;
}

export function paymentMetadataClaimId(payment: DodoPaymentSnapshot): string {
  return String(payment.metadata?.claim_id ?? "").trim();
}

export function assertSponsorPaymentMatchesClaim(
  payment: DodoPaymentSnapshot,
  claimId: string,
  bidCents: number,
  options?: { targetRank?: number },
) {
  if (payment.status !== "succeeded") {
    throw new Error("Payment is not successful.");
  }
  const metadataClaimId = String(payment.metadata?.claim_id ?? "").trim();
  if (metadataClaimId !== claimId) {
    throw new Error("Payment is not linked to this sponsor claim.");
  }
  const paidChargeCents = resolvedSponsorPaidChargeCents(payment);
  if (paidChargeCents === null || paidChargeCents !== bidCents) {
    throw new Error("Payment amount does not match the sponsor bid.");
  }
  const rankMetadata = payment.metadata?.target_rank;
  if (
    options?.targetRank !== undefined
    && Number.isInteger(options.targetRank)
    && rankMetadata !== undefined
    && rankMetadata !== null
    && String(rankMetadata).trim() !== ""
  ) {
    const paidRank = Number(rankMetadata);
    if (!Number.isInteger(paidRank) || paidRank !== options.targetRank) {
      throw new Error("Payment rank metadata does not match this sponsor claim.");
    }
  }
}

export function isSponsorVerificationError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  const message = error.message;
  return (
    message.includes("Payment is not")
    || message.includes("does not match")
    || message.includes("not linked")
    || message.includes("already activated by a different")
    || message.includes("not eligible for activation")
  );
}
