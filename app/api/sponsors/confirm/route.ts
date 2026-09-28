import {
  activateClaim,
  appwriteClaimsAreConfigured,
  findClaimById,
  isAppwriteRowNotFound,
} from "../../../../lib/sponsors/appwrite";
import {
  assertSponsorPaymentMatchesClaim,
  claimBidCents,
  createDodoClient,
  dodoApiErrorStatus,
  isRetryableDodoLookupError,
  isSponsorVerificationError,
  paymentMetadataClaimId,
} from "../../../../lib/sponsors/dodo-payments";

export const runtime = "nodejs";

const PAYMENT_ID_PATTERN = /^pay_[A-Za-z0-9_-]{8,128}$/;
const CLAIM_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function verificationFailureResponse(error: unknown) {
  if (isSponsorVerificationError(error)) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  console.error("Sponsor payment verification failed:", error);
  return Response.json({ error: "Sponsor payment verification failed." }, { status: 409 });
}

async function confirmPaymentId(paymentId: string, fallbackClaimId?: string): Promise<Response> {
  const client = createDodoClient();
  let payment;
  try {
    payment = await client.payments.retrieve(paymentId, { signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    const status = dodoApiErrorStatus(error);
    if (status === 404 && fallbackClaimId && CLAIM_ID_PATTERN.test(fallbackClaimId)) {
      return confirmClaimId(fallbackClaimId);
    }
    throw error;
  }

  if (payment.status !== "succeeded") {
    if (payment.status === "failed" || payment.status === "cancelled") {
      return Response.json({
        error: "This payment did not complete, so the sponsor placement was not activated.",
      }, { status: 409 });
    }
    return Response.json({
      error: `Payment is still ${payment.status ?? "processing"}.`,
    }, { status: 202 });
  }

  const claimId = paymentMetadataClaimId(payment);
  if (!CLAIM_ID_PATTERN.test(claimId)) {
    return Response.json({ error: "This payment is not linked to a sponsor claim." }, { status: 409 });
  }
  if (fallbackClaimId && fallbackClaimId !== claimId) {
    return Response.json({
      error: "This payment return does not match the sponsor claim in the payment record.",
    }, { status: 409 });
  }

  try {
    const claim = await findClaimById(claimId);
    const claimData = claim as unknown as Record<string, unknown>;
    if (claimData.status === "activated") {
      return Response.json({ activated: true });
    }
    const bidCents = claimBidCents(claimData);
    if (bidCents === null) {
      return Response.json({ error: "This sponsor claim is invalid." }, { status: 409 });
    }
    const targetRank = Number(claimData.targetRank);
    assertSponsorPaymentMatchesClaim(payment, claimId, bidCents, {
      targetRank: Number.isInteger(targetRank) ? targetRank : undefined,
    });
    await activateClaim(claimId, paymentId);
    return Response.json({ activated: true });
  } catch (error) {
    if (isAppwriteRowNotFound(error)) {
      return Response.json({
        error: "This sponsor claim could not be found. Start a new sponsor checkout or contact support.",
      }, { status: 409 });
    }
    if (isSponsorVerificationError(error)) {
      return verificationFailureResponse(error);
    }
    console.error("Sponsor activation pending:", error);
    return Response.json({
      error: "Payment was verified, but sponsor activation is still pending. Please refresh shortly.",
    }, { status: 202 });
  }
}

async function confirmClaimId(claimId: string): Promise<Response> {
  let claim;
  try {
    claim = await findClaimById(claimId);
  } catch (error) {
    if (isAppwriteRowNotFound(error)) {
      return Response.json({
        error: "This sponsor claim could not be found. Start a new sponsor checkout or contact support.",
      }, { status: 409 });
    }
    throw error;
  }
  const claimData = claim as unknown as Record<string, unknown>;

  if (claimData.status === "activated") {
    return Response.json({ activated: true });
  }

  const storedPaymentId = typeof claimData.paymentId === "string" ? claimData.paymentId.trim() : "";
  if (PAYMENT_ID_PATTERN.test(storedPaymentId)) {
    return confirmPaymentId(storedPaymentId);
  }

  return Response.json({
    error: "Payment was received. Sponsor activation is still pending.",
  }, { status: 202 });
}

function dodoLookupFailureResponse(error: unknown) {
  const status = dodoApiErrorStatus(error);
  if (status === 404) {
    return Response.json({
      error: "We could not find this payment record. If checkout succeeded, wait a moment and refresh - activation may still complete via webhook.",
    }, { status: 409 });
  }
  if (status === 401 || status === 403) {
    return Response.json({ error: "Payment verification is misconfigured for this environment." }, { status: 503 });
  }
  if (!isRetryableDodoLookupError(error)) {
    return Response.json({
      error: "We could not verify this payment. Check that Dodo test/live mode matches your API key.",
    }, { status: 409 });
  }
  console.error("Sponsor payment lookup failed:", error);
  return Response.json({ error: "We could not verify this payment yet. Please try again." }, { status: 502 });
}

export async function GET(request: Request) {
  if (!appwriteClaimsAreConfigured() || !process.env.DODO_PAYMENTS_API_KEY) {
    return Response.json({ error: "Sponsor confirmation is not configured." }, { status: 503 });
  }

  const params = new URL(request.url).searchParams;
  const paymentId = params.get("payment_id")?.trim();
  const claimId = params.get("claim_id")?.trim();
  const fallbackClaimId = claimId && CLAIM_ID_PATTERN.test(claimId) ? claimId : undefined;

  if (paymentId) {
    if (!PAYMENT_ID_PATTERN.test(paymentId)) {
      return Response.json({ error: "A valid payment ID is required." }, { status: 400 });
    }
    try {
      return await confirmPaymentId(paymentId, fallbackClaimId);
    } catch (error) {
      return dodoLookupFailureResponse(error);
    }
  }

  if (claimId) {
    if (!CLAIM_ID_PATTERN.test(claimId)) {
      return Response.json({ error: "A valid claim ID is required." }, { status: 400 });
    }
    try {
      return await confirmClaimId(claimId);
    } catch (error) {
      console.error("Sponsor claim lookup failed:", error);
      return Response.json({ error: "We could not verify this sponsor claim yet. Please try again." }, { status: 502 });
    }
  }

  return Response.json({ error: "A payment ID or claim ID is required." }, { status: 400 });
}
