import "server-only";

import { activateClaim, findClaimById, listActiveSponsors } from "./appwrite";
import {
  assertSponsorPaymentMatchesClaim,
  claimBidCents,
  createDodoClient,
  paymentMetadataClaimId,
  type DodoPaymentSnapshot,
} from "./dodo-payments";
import { expectedSponsorChargeCents } from "./sponsor-identity";
import { isSponsorClaimId } from "./claim-id";

const PAYMENT_ID_PATTERN = /^pay_[A-Za-z0-9_-]{8,128}$/;

export function normalizeWebhookPaymentId(
  paymentId: string | undefined,
): string | null {
  const trimmed = paymentId?.trim();
  if (!trimmed || !PAYMENT_ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export async function retrieveSponsorPayment(paymentId: string): Promise<DodoPaymentSnapshot> {
  const client = createDodoClient();
  return client.payments.retrieve(paymentId, { signal: AbortSignal.timeout(10_000) });
}

export function resolveWebhookClaimId(
  eventClaimId: string | undefined,
  payment: DodoPaymentSnapshot,
): string | null {
  const fromEvent = eventClaimId?.trim();
  if (fromEvent && isSponsorClaimId(fromEvent)) return fromEvent;
  const fromPayment = paymentMetadataClaimId(payment);
  return isSponsorClaimId(fromPayment) ? fromPayment : null;
}

export type ActivateSponsorFromPaymentResult =
  | { outcome: "activated" }
  | { outcome: "already_activated" }
  | { outcome: "verification_failed" }
  | { outcome: "invalid_claim" };

/** Shared sponsor activation used by webhook and kept in sync with confirm verification. */
export async function activateSponsorFromPayment(
  claimId: string,
  paymentId: string,
  payment: DodoPaymentSnapshot,
): Promise<ActivateSponsorFromPaymentResult> {
  const claim = await findClaimById(claimId);
  const claimData = claim as unknown as Record<string, unknown>;
  if (claimData.status === "activated") {
    return { outcome: "already_activated" };
  }
  if (claimBidCents(claimData) === null) {
    return { outcome: "invalid_claim" };
  }
  const activeSponsors = await listActiveSponsors();
  const chargeCents = expectedSponsorChargeCents(claimData, activeSponsors);
  if (chargeCents === null) {
    return { outcome: "invalid_claim" };
  }
  const targetRank = Number(claimData.targetRank);
  try {
    assertSponsorPaymentMatchesClaim(payment, claimId, chargeCents, {
      targetRank: Number.isInteger(targetRank) ? targetRank : undefined,
    });
  } catch {
    return { outcome: "verification_failed" };
  }

  await activateClaim(claimId, paymentId);
  return { outcome: "activated" };
}
