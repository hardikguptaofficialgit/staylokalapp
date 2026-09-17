import DodoPayments from "dodopayments";
import { activateClaim } from "../../../../lib/sponsors/appwrite";
import {
  sendSponsorActivatedEmail,
  sendSponsorPaymentFailedEmail,
} from "../../../../lib/notifications/resend";

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
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!apiKey || !webhookKey) {
    return Response.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!rawBody) {
    return Response.json({ error: "Webhook body is empty." }, { status: 400 });
  }

  let event: DodoEvent;
  try {
    const client = new DodoPayments({
      bearerToken: apiKey,
      environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode" ? "test_mode" : "live_mode",
    });
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
  if (event.type === "payment.failed" && !claimId) {
    return Response.json({ received: true });
  }
  if (!claimId) {
    return Response.json({ error: "Webhook is missing sponsor claim metadata." }, { status: 400 });
  }
  if (!paymentId || !/^pay_[A-Za-z0-9_-]{8,128}$/.test(paymentId)) {
    return Response.json({ error: "Webhook is missing payment metadata." }, { status: 400 });
  }

  const email = event.data?.customer?.email;
  const emailDetails = {
    email: email ?? "",
    rank: event.data?.metadata?.target_rank,
    bid: event.data?.metadata?.bid,
    paymentId,
  };

  if (event.type === "payment.failed") {
    try {
      await sendSponsorPaymentFailedEmail(emailDetails);
      return Response.json({ received: true });
    } catch (error) {
      console.error("Sponsor payment-failure email failed:", error);
      return Response.json({ error: "Payment failure notification will be retried." }, { status: 500 });
    }
  }

  try {
    await activateClaim(claimId, paymentId);
    await sendSponsorActivatedEmail({
      ...emailDetails,
      companyName: event.data?.metadata?.company_name,
    });
    return Response.json({ received: true });
  } catch (error) {
    console.error("Sponsor activation or notification failed:", error);
    return Response.json({ error: "Sponsor activation will be retried." }, { status: 500 });
  }
}
