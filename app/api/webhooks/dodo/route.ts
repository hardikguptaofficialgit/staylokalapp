import { activateClaim, findClaimById } from "../../../../lib/sponsors/appwrite";
import {
  assertSponsorPaymentMatchesClaim,
  createDodoClient,
} from "../../../../lib/sponsors/dodo-payments";
import {
  sendSponsorActivatedEmail,
  sendSponsorPaymentFailedEmail,
} from "../../../../lib/notifications/sponsor-email";

export const runtime = "nodejs";

type DodoEvent = {
  type?: string;
  data?: {
    metadata?: Record<string, string>;
    payment_id?: string;
    paymentId?: string;
    customer?: {
      email?: string;
    };
  };
};

export async function POST(request: Request) {
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!process.env.DODO_PAYMENTS_API_KEY || !webhookKey) {
    return Response.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!rawBody) {
    return Response.json({ error: "Webhook body is empty." }, { status: 400 });
  }

  let event: DodoEvent;
  try {
    const client = createDodoClient();
    event = client.webhooks.unwrap(rawBody, {
      headers: Object.fromEntries(request.headers.entries()),
      key: webhookKey,
    }) as DodoEvent;
  } catch {
    return Response.json({ error: "Invalid webhook." }, { status: 400 });
  }

  if (event.type !== "payment.succeeded" && event.type !== "payment.failed") {
    return Response.json({ received: true });
  }

  const claimId = event.data?.metadata?.claim_id;
  const paymentId = event.data?.payment_id ?? event.data?.paymentId;
  const metadataSource = event.data?.metadata?.source;
  if (!claimId) {
    if (event.type === "payment.failed" || metadataSource === "staylokal-donation") {
      return Response.json({ received: true });
    }
    return Response.json({ error: "Webhook is missing sponsor claim metadata." }, { status: 400 });
  }
  if (!paymentId || !/^pay_[A-Za-z0-9_-]{8,128}$/.test(paymentId)) {
    return Response.json({ error: "Webhook is missing payment metadata." }, { status: 400 });
  }

  const email = event.data?.customer?.email?.trim() ?? "";
  const emailDetails = {
    email,
    rank: event.data?.metadata?.target_rank,
    bid: event.data?.metadata?.bid,
    paymentId,
  };

  if (event.type === "payment.failed") {
    if (!email) {
      console.warn("Sponsor payment failed without customer email; skipping notification.");
      return Response.json({ received: true });
    }
    try {
      await sendSponsorPaymentFailedEmail(emailDetails);
      return Response.json({ received: true });
    } catch (error) {
      console.error("Sponsor payment-failure email failed:", error);
      return Response.json({ error: "Payment failure notification will be retried." }, { status: 500 });
    }
  }

  try {
    const claim = await findClaimById(claimId);
    const claimData = claim as unknown as Record<string, unknown>;
    const bidCents = Number(claimData.bidCents);
    if (!Number.isSafeInteger(bidCents)) {
      return Response.json({ error: "Sponsor claim is invalid." }, { status: 400 });
    }

    const client = createDodoClient();
    const payment = await client.payments.retrieve(paymentId, { signal: AbortSignal.timeout(10_000) });
    const targetRank = Number(claimData.targetRank);
    try {
      assertSponsorPaymentMatchesClaim(payment, claimId, bidCents, {
        targetRank: Number.isInteger(targetRank) ? targetRank : undefined,
      });
    } catch {
      return Response.json({ error: "Sponsor payment verification failed." }, { status: 400 });
    }

    await activateClaim(claimId, paymentId);
    if (email) {
      await sendSponsorActivatedEmail({
        ...emailDetails,
        companyName: event.data?.metadata?.company_name,
      });
    } else {
      console.warn("Sponsor payment succeeded without customer email; activation email skipped.");
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Sponsor activation or notification failed:", error);
    return Response.json({ error: "Sponsor activation will be retried." }, { status: 500 });
  }
}
