import { findClaimById } from "../../../../lib/sponsors/appwrite";
import { createDodoClient } from "../../../../lib/sponsors/dodo-payments";
import {
  sendSponsorActivatedEmail,
  sendSponsorPaymentFailedEmail,
} from "../../../../lib/notifications/sponsor-email";
import { isSponsorClaimId } from "../../../../lib/sponsors/claim-id";
import {
  activateSponsorFromPayment,
  normalizeWebhookPaymentId,
  resolveWebhookClaimId,
  retrieveSponsorPayment,
} from "../../../../lib/sponsors/webhook-activate-sponsor";

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

  const paymentId = normalizeWebhookPaymentId(
    event.data?.payment_id ?? event.data?.paymentId,
  );
  const metadataSource = event.data?.metadata?.source;

  if (!paymentId) {
    if (event.type === "payment.failed" || metadataSource === "staylokal-donation") {
      return Response.json({ received: true });
    }
    return Response.json({ error: "Webhook is missing payment metadata." }, { status: 400 });
  }

  if (event.type === "payment.failed") {
    const claimId = event.data?.metadata?.claim_id?.trim();
    const email = event.data?.customer?.email?.trim() ?? "";
    if (!claimId || !isSponsorClaimId(claimId)) {
      if (metadataSource === "staylokal-donation") {
        return Response.json({ received: true });
      }
      return Response.json({ received: true });
    }
    if (!email) {
      console.warn("Sponsor payment failed without customer email; skipping notification.");
      return Response.json({ received: true });
    }
    try {
      await sendSponsorPaymentFailedEmail({
        email,
        rank: event.data?.metadata?.target_rank,
        bid: event.data?.metadata?.bid,
        paymentId,
      });
      return Response.json({ received: true });
    } catch (error) {
      console.error("Sponsor payment-failure email failed:", error);
      return Response.json({ error: "Payment failure notification will be retried." }, { status: 500 });
    }
  }

  const eventClaimId = event.data?.metadata?.claim_id?.trim();
  if (eventClaimId && isSponsorClaimId(eventClaimId)) {
    try {
      const existing = await findClaimById(eventClaimId);
      if ((existing as unknown as Record<string, unknown>).status === "activated") {
        return Response.json({ received: true });
      }
    } catch {
      // Fall through to payment lookup and full activation path.
    }
  }

  let payment;
  try {
    payment = await retrieveSponsorPayment(paymentId);
  } catch (error) {
    console.error("Sponsor webhook payment lookup failed:", error);
    return Response.json({ error: "Sponsor activation will be retried." }, { status: 500 });
  }

  const claimId = resolveWebhookClaimId(event.data?.metadata?.claim_id, payment);
  if (!claimId) {
    if (metadataSource === "staylokal-donation") {
      return Response.json({ received: true });
    }
    return Response.json({ error: "Webhook is missing sponsor claim metadata." }, { status: 400 });
  }

  const email = event.data?.customer?.email?.trim() ?? "";
  const emailDetails = {
    email,
    rank: event.data?.metadata?.target_rank ?? String(payment.metadata?.target_rank ?? ""),
    bid: event.data?.metadata?.bid ?? String(payment.metadata?.bid ?? ""),
    paymentId,
    companyName: event.data?.metadata?.company_name ?? String(payment.metadata?.company_name ?? ""),
  };

  try {
    const claim = await findClaimById(claimId);
    const claimData = claim as unknown as Record<string, unknown>;
    if (claimData.status === "activated") {
      return Response.json({ received: true });
    }

    const result = await activateSponsorFromPayment(claimId, paymentId, payment);
    if (result.outcome === "verification_failed") {
      return Response.json({ error: "Sponsor payment verification failed." }, { status: 400 });
    }
    if (result.outcome === "invalid_claim") {
      return Response.json({ error: "Sponsor claim is invalid." }, { status: 400 });
    }

    if (email) {
      try {
        await sendSponsorActivatedEmail(emailDetails);
      } catch (error) {
        console.error("Sponsor activation email failed (sponsor is active):", error);
      }
    } else {
      console.warn("Sponsor payment succeeded without customer email; activation email skipped.");
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Sponsor activation or notification failed:", error);
    return Response.json({ error: "Sponsor activation will be retried." }, { status: 500 });
  }
}
