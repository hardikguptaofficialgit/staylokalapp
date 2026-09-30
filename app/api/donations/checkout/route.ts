import { isDodoCheckoutUrl } from "../../../../lib/app/checkout-url";
import { donationAmountToCents, MAXIMUM_DONATION_CENTS } from "../../../../lib/donations";
import { staylokalCheckoutSessionOptions } from "../../../../lib/payments/dodo-checkout-session";
import { createDodoClient } from "../../../../lib/sponsors/dodo-payments";

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
    const parsed = Number(body.amount);
    if (Number.isFinite(parsed) && parsed * 100 > MAXIMUM_DONATION_CENTS) {
      return Response.json({ error: "Donation amount exceeds the supported maximum." }, { status: 400 });
    }
    return Response.json({ error: "Donation amount must be at least $5." }, { status: 400 });
  }

  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  const productId = process.env.DODO_DONATION_PRODUCT_ID;
  if (!apiKey || !productId) {
    return Response.json({ error: "Donations are not configured yet." }, { status: 503 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const returnUrl = process.env.DODO_PAYMENTS_RETURN_URL ?? `${origin}/donate`;
  try {
    const client = createDodoClient();
    const session = await client.checkoutSessions.create({
      ...staylokalCheckoutSessionOptions(),
      metadata: { source: "staylokal-donation", usd_cents: String(amount) },
      product_cart: [{ amount, product_id: productId, quantity: 1 }],
      return_url: returnUrl,
    });

    if (!isDodoCheckoutUrl(session.checkout_url)) {
      return Response.json({ error: "Unable to start secure checkout." }, { status: 502 });
    }
    return Response.json({ checkoutUrl: session.checkout_url });
  } catch {
    return Response.json({ error: "Unable to start secure checkout." }, { status: 502 });
  }
}
