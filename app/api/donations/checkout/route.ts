import DodoPayments from "dodopayments";
import { donationAmountToCents } from "../../../../lib/donations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { amount?: unknown };
  try {
    body = (await request.json()) as { amount?: unknown };
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const amount = donationAmountToCents(body.amount);
  if (amount === null) {
    return Response.json({ error: "Donation amount must be at least $5." }, { status: 400 });
  }

  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  const productId = process.env.DODO_DONATION_PRODUCT_ID;
  if (!apiKey || !productId) {
    return Response.json({ error: "Donations are not configured yet." }, { status: 503 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const returnUrl = process.env.DODO_PAYMENTS_RETURN_URL ?? `${origin}/donate?success=1`;
  const client = new DodoPayments({
    bearerToken: apiKey,
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode" ? "test_mode" : "live_mode",
  });

  try {
    const session = await client.checkoutSessions.create({
      billing_currency: "USD",
      metadata: { source: "staylokal-donation" },
      product_cart: [{ amount, product_id: productId, quantity: 1 }],
      return_url: returnUrl,
    });

    return Response.json({ checkoutUrl: session.checkout_url });
  } catch {
    return Response.json({ error: "Unable to start secure checkout." }, { status: 502 });
  }
}
