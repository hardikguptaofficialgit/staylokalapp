import DodoPayments from "dodopayments";
import { activateClaim, appwriteClaimsAreConfigured } from "../../../../lib/sponsors/appwrite";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const paymentId = new URL(request.url).searchParams.get("payment_id")?.trim();
  if (!paymentId || !/^pay_[A-Za-z0-9_-]{8,128}$/.test(paymentId)) {
    return Response.json({ error: "A valid payment ID is required." }, { status: 400 });
  }
  if (!appwriteClaimsAreConfigured() || !process.env.DODO_PAYMENTS_API_KEY) {
    return Response.json({ error: "Sponsor confirmation is not configured." }, { status: 503 });
  }

  const client = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode" ? "test_mode" : "live_mode",
  });
  let payment;
  try {
    payment = await client.payments.retrieve(paymentId, { signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    console.error("Sponsor payment lookup failed:", error);
    return Response.json({ error: "We could not verify this payment yet. Please try again." }, { status: 502 });
  }

  if (payment.status !== "succeeded") {
    return Response.json({
      error: payment.status === "failed" || payment.status === "cancelled"
        ? "This payment did not complete, so the sponsor placement was not activated."
        : `Payment is still ${payment.status ?? "processing"}.`,
    }, { status: 409 });
  }

  const claimId = String(payment.metadata?.claim_id ?? "");
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(claimId)) {
    return Response.json({ error: "This payment is not linked to a sponsor claim." }, { status: 409 });
  }

  try {
    await activateClaim(claimId, paymentId);
    return Response.json({ activated: true });
  } catch (error) {
    console.error("Sponsor activation pending:", error);
    return Response.json({ error: "Payment was verified, but sponsor activation is still pending. Please refresh shortly." }, { status: 202 });
  }
}
