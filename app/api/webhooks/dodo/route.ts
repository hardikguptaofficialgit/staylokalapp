import DodoPayments from "dodopayments";
import { activateClaim } from "../../../../lib/sponsors/appwrite";

export const runtime = "nodejs";

type DodoEvent = {
  type?: string;
  data?: {
    metadata?: Record<string, string>;
    payment_id?: string;
    paymentId?: string;
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

  if (event.type !== "payment.succeeded") {
    return Response.json({ received: true });
  }

  const claimId = event.data?.metadata?.claim_id;
  const paymentId = event.data?.payment_id ?? event.data?.paymentId;
  if (!claimId) return Response.json({ received: true });
  if (!paymentId || paymentId.length > 128) {
    return Response.json({ error: "Webhook is missing payment metadata." }, { status: 400 });
  }

  try {
    await activateClaim(claimId, paymentId);
    return Response.json({ received: true });
  } catch (error) {
    console.error("Sponsor activation failed:", error);
    return Response.json({ error: "Sponsor activation will be retried." }, { status: 500 });
  }
}
