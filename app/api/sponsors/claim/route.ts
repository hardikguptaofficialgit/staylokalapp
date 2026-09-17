import DodoPayments from "dodopayments";
import {
  appwriteClaimsAreConfigured,
  createPendingClaim,
  uploadSponsorLogo,
} from "../../../../lib/sponsors/appwrite";
import { isBidEnoughForRank, minimumBidForRank } from "../../../../lib/sponsors/ranking";
import { listActiveSponsors } from "../../../../lib/sponsors/appwrite";
import { validateSponsorClaim } from "../../../../lib/sponsors/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!appwriteClaimsAreConfigured() || !process.env.DODO_SPONSOR_PRODUCT_ID || !process.env.DODO_PAYMENTS_API_KEY) {
    return Response.json({ error: "Sponsor claims are not configured yet." }, { status: 503 });
  }

  let body: {
    targetRank?: unknown;
    companyName?: unknown;
    destination?: unknown;
    category?: unknown;
    description?: unknown;
    bidCents?: unknown;
    logoDataUrl?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const targetRank = Number(body.targetRank);
  if (!Number.isInteger(targetRank) || targetRank < 1 || targetRank > 5) {
    return Response.json({ error: "Choose a valid sponsor rank." }, { status: 400 });
  }

  const claim = validateSponsorClaim(body);
  if (!claim) {
    return Response.json({ error: "Check the company details, URL, category, and bid amount." }, { status: 400 });
  }

  try {
    const currentSponsors = await listActiveSponsors();
    const minimumBid = minimumBidForRank(currentSponsors, targetRank);
    if (!isBidEnoughForRank(currentSponsors, targetRank, claim.bidCents)) {
      return Response.json({
        error: `That rank now requires at least ${(minimumBid / 100).toFixed(2)} USD. Refresh and try again.`,
        minimumBidCents: minimumBid,
      }, { status: 409 });
    }

    const claimId = crypto.randomUUID();
    const logoUrl = claim.logoDataUrl
      ? await uploadSponsorLogo(claim.logoDataUrl, claimId)
      : undefined;
    const destinationUrl = new URL(claim.destinationUrl);
    const fallbackLogoUrl = logoUrl ?? `${destinationUrl.origin}/favicon.ico`;
    const pendingClaim = await createPendingClaim({
      bidCents: claim.bidCents,
      category: claim.category,
      companyName: claim.companyName,
      description: claim.description,
      destinationUrl: claim.destinationUrl,
      handle: claim.handle ?? "",
      logoUrl: fallbackLogoUrl,
      status: "pending",
      targetRank,
    });

    const client = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode" ? "test_mode" : "live_mode",
    });
    const session = await client.checkoutSessions.create({
      billing_currency: "USD",
      metadata: {
        bid: `$${(claim.bidCents / 100).toFixed(2)}`,
        claim_id: pendingClaim.$id,
        company_name: claim.companyName,
        target_rank: String(targetRank),
      },
      product_cart: [{
        amount: claim.bidCents,
        product_id: process.env.DODO_SPONSOR_PRODUCT_ID,
        quantity: 1,
      }],
      return_url: process.env.DODO_SPONSOR_RETURN_URL ?? `${new URL(request.url).origin}/?sponsor=success`,
    });

    return Response.json({ checkoutUrl: session.checkout_url });
  } catch (error) {
    console.error("Sponsor checkout failed:", error);
    return Response.json({ error: "Unable to create sponsor checkout." }, { status: 502 });
  }
}
