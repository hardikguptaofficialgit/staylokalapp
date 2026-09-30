import { isDodoCheckoutUrl } from "../../../../lib/app/checkout-url";
import { staylokalCheckoutSessionOptions } from "../../../../lib/payments/dodo-checkout-session";
import { appOriginFromRequest } from "../../../../lib/sponsors/app-origin";
import { buildSponsorCheckoutReturnUrl } from "../../../../lib/sponsors/checkout-return-url";
import { createDodoClient } from "../../../../lib/sponsors/dodo-payments";
import {
  appwriteClaimsAreConfigured,
  createPendingClaim,
  uploadSponsorLogo,
} from "../../../../lib/sponsors/appwrite";
import { isBidEnoughForRank, minimumBidForRank } from "../../../../lib/sponsors/ranking";
import { computeSponsorCheckoutAmounts } from "../../../../lib/sponsors/sponsor-identity";
import { listActiveSponsors } from "../../../../lib/sponsors/appwrite";
import { validateSponsorClaim } from "../../../../lib/sponsors/validation";

export const runtime = "nodejs";

const MAX_CLAIM_BODY_BYTES = 750_000;

export async function POST(request: Request) {
  if (!appwriteClaimsAreConfigured() || !process.env.DODO_SPONSOR_PRODUCT_ID || !process.env.DODO_PAYMENTS_API_KEY) {
    return Response.json({ error: "Sponsor claims are not configured yet." }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_CLAIM_BODY_BYTES) {
    return Response.json({ error: "Request body is too large." }, { status: 413 });
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

    const logoSeed = crypto.randomUUID();
    const logoUrl = claim.logoDataUrl
      ? await uploadSponsorLogo(claim.logoDataUrl, logoSeed)
      : undefined;
    const latestSponsors = await listActiveSponsors();
    if (!isBidEnoughForRank(latestSponsors, targetRank, claim.bidCents)) {
      const minimumBid = minimumBidForRank(latestSponsors, targetRank);
      return Response.json({
        error: `That rank now requires at least ${(minimumBid / 100).toFixed(2)} USD. Refresh and try again.`,
        minimumBidCents: minimumBid,
      }, { status: 409 });
    }

    const checkout = computeSponsorCheckoutAmounts(latestSponsors, claim);
    if ("error" in checkout) {
      return Response.json({ error: checkout.error }, { status: 400 });
    }

    const appOrigin = appOriginFromRequest(request);
    const pendingClaim = await createPendingClaim({
      bidCents: claim.bidCents,
      category: claim.category,
      companyName: claim.companyName,
      description: claim.description,
      destinationUrl: claim.destinationUrl,
      handle: claim.handle ?? "",
      logoUrl: logoUrl ?? "",
      status: "pending",
      targetRank,
      ...(checkout.priorSponsorId ? { sponsorId: checkout.priorSponsorId } : {}),
    });

    const client = createDodoClient();
    const session = await client.checkoutSessions.create({
      ...staylokalCheckoutSessionOptions(),
      metadata: {
        bid: `$${(claim.bidCents / 100).toFixed(2)}`,
        bid_usd_cents: String(claim.bidCents),
        charge: `$${(checkout.chargeCents / 100).toFixed(2)}`,
        charge_usd_cents: String(checkout.chargeCents),
        claim_id: pendingClaim.$id,
        company_name: claim.companyName,
        target_rank: String(targetRank),
        ...(checkout.priorBidCents > 0
          ? { prior_bid: `$${(checkout.priorBidCents / 100).toFixed(2)}` }
          : {}),
      },
      product_cart: [{
        amount: checkout.chargeCents,
        product_id: process.env.DODO_SPONSOR_PRODUCT_ID,
        quantity: 1,
      }],
      return_url: buildSponsorCheckoutReturnUrl(appOrigin, pendingClaim.$id),
    });

    if (!isDodoCheckoutUrl(session.checkout_url)) {
      return Response.json({ error: "Unable to create sponsor checkout." }, { status: 502 });
    }
    return Response.json({ checkoutUrl: session.checkout_url, claimId: pendingClaim.$id });
  } catch (error) {
    console.error("Sponsor checkout failed:", error);
    const detail = error instanceof Error ? error.message : "Unable to create sponsor checkout.";
    const message = process.env.NODE_ENV === "development" ? detail : "Unable to create sponsor checkout.";
    return Response.json({ error: message }, { status: 502 });
  }
}
