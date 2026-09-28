import {
  donationVerifyHttpStatus,
  DONATION_PAYMENT_ID_PATTERN,
  verifyDonationPayment,
} from "../../../../lib/donations/verify-payment";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DODO_PAYMENTS_API_KEY) {
    return Response.json({ error: "Donation confirmation is not configured." }, { status: 503 });
  }

  const paymentId = new URL(request.url).searchParams.get("payment_id")?.trim()
    ?? new URL(request.url).searchParams.get("paymentId")?.trim();
  if (!paymentId || !DONATION_PAYMENT_ID_PATTERN.test(paymentId)) {
    return Response.json({ error: "A valid payment ID is required." }, { status: 400 });
  }

  try {
    const result = await verifyDonationPayment(paymentId);
    switch (result.kind) {
      case "verified":
        return Response.json({ verified: true });
      case "pending":
        return Response.json({
          error: `Payment is still ${result.status}.`,
        }, { status: 202 });
      case "failed":
        return Response.json({
          error: "This payment did not complete.",
        }, { status: 409 });
      case "not_donation":
        return Response.json({
          error: "This payment is not a StayLokal donation.",
        }, { status: 409 });
      case "invalid_amount":
        return Response.json({
          error: "This donation amount could not be verified.",
        }, { status: 409 });
      case "invalid":
        return Response.json({ error: "A valid payment ID is required." }, { status: 400 });
      default:
        return Response.json({ error: "Unable to verify this payment." }, { status: 409 });
    }
  } catch (error) {
    console.error("Donation payment lookup failed:", error);
    const status = donationVerifyHttpStatus(error);
    const message = status === 503
      ? "Payment verification is misconfigured for this environment."
      : status === 409
        ? "We could not find this payment record."
        : "We could not verify this payment yet. Please try again.";
    return Response.json({ error: message }, { status });
  }
}
