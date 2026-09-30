import { MAXIMUM_DONATION_CENTS, MINIMUM_DONATION_CENTS } from "../donations";
import {
  createDodoClient,
  dodoApiErrorStatus,
  isRetryableDodoLookupError,
  paymentAmountCents,
} from "../sponsors/dodo-payments";

export const DONATION_PAYMENT_ID_PATTERN = /^pay_[A-Za-z0-9_-]{8,128}$/;

export function isStayLokalDonationMetadata(metadata?: Record<string, unknown>): boolean {
  return String(metadata?.source ?? "").trim() === "staylokal-donation";
}

function donationUsdCentsFromMetadata(metadata?: Record<string, unknown>): number | null {
  const raw = metadata?.usd_cents ?? metadata?.donation_usd_cents;
  if (raw === undefined || raw === null) return null;
  const cents = Number(String(raw).trim());
  return Number.isSafeInteger(cents) ? cents : null;
}

export function resolvedDonationUsdCents(payment: {
  metadata?: Record<string, string | number | boolean | undefined>;
  total_amount?: number;
  amount?: number;
}): number | null {
  const fromMetadata = donationUsdCentsFromMetadata(payment.metadata);
  if (fromMetadata !== null) return fromMetadata;
  return paymentAmountCents(payment);
}

export async function verifyDonationPayment(paymentId: string) {
  if (!DONATION_PAYMENT_ID_PATTERN.test(paymentId)) {
    return { kind: "invalid" as const };
  }

  const client = createDodoClient();
  const payment = await client.payments.retrieve(paymentId, { signal: AbortSignal.timeout(10_000) });

  if (payment.status !== "succeeded") {
    if (payment.status === "failed" || payment.status === "cancelled") {
      return { kind: "failed" as const };
    }
    return { kind: "pending" as const, status: payment.status ?? "processing" };
  }

  if (!isStayLokalDonationMetadata(payment.metadata as Record<string, unknown> | undefined)) {
    return { kind: "not_donation" as const };
  }

  const amountCents = resolvedDonationUsdCents(payment);
  if (amountCents === null || amountCents < MINIMUM_DONATION_CENTS || amountCents > MAXIMUM_DONATION_CENTS) {
    return { kind: "invalid_amount" as const };
  }

  return { kind: "verified" as const };
}

export function donationVerifyHttpStatus(error: unknown): number {
  const status = dodoApiErrorStatus(error);
  if (status === 404) return 409;
  if (status === 401 || status === 403) return 503;
  if (status !== undefined && !isRetryableDodoLookupError(error)) return 409;
  return 502;
}
