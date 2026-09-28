import "server-only";

import DodoPayments from "dodopayments";
import { normalizeBidCents } from "./ranking";

export type DodoPaymentSnapshot = {
  amount?: number;
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

export function metadataBidCents(metadata?: DodoPaymentSnapshot["metadata"]): number | null {
  const bid = metadata?.bid;
  if (typeof bid !== "string") return null;
  const match = /^\$(\d+(?:\.\d{2})?)$/.exec(bid.trim());
  if (!match) return null;
  const dollars = Number.parseFloat(match[1]);
  if (!Number.isFinite(dollars)) return null;
  const cents = Math.round(dollars * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function resolvedSponsorBidCents(payment: DodoPaymentSnapshot): number | null {
  return paymentBidCents(payment) ?? metadataBidCents(payment.metadata);
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
  const paidBidCents = resolvedSponsorBidCents(payment);
  if (paidBidCents === null || paidBidCents !== bidCents) {
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
