import { appOriginFromRequest } from "../../../../lib/sponsors/app-origin";
import { createDodoClient } from "../../../../lib/sponsors/dodo-payments";
import {
  appwriteClaimsAreConfigured,
  createPendingClaim,
  uploadSponsorLogo,
} from "../../../../lib/sponsors/appwrite";
import { isBidEnoughForRank, minimumBidForRank } from "../../../../lib/sponsors/ranking";
import { listActiveSponsors } from "../../../../lib/sponsors/appwrite";
import { validateSponsorClaim } from "../../../../lib/sponsors/validation";

export const runtime = "nodejs";

function buildSponsorCheckoutReturnUrl(appOrigin: string, claimId: string) {
  const configured = process.env.DODO_SPONSOR_RETURN_URL?.trim();
  const url = new URL(configured || `${appOrigin.replace(/\/+$/, "")}/`);
  url.searchParams.set("sponsor", "success");
  url.searchParams.set("claim_id", claimId);
  return url.toString();
}

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

    const logoSeed = crypto.randomUUID();
    const logoUrl = claim.logoDataUrl
      ? await uploadSponsorLogo(claim.logoDataUrl, logoSeed)
      : undefined;
    const appOrigin = appOriginFromRequest(request);
    const fallbackLogoUrl = logoUrl ?? `${appOrigin}/images/logo.png`;
    const latestSponsors = await listActiveSponsors();
    if (!isBidEnoughForRank(latestSponsors, targetRank, claim.bidCents)) {
      const minimumBid = minimumBidForRank(latestSponsors, targetRank);
      return Response.json({
        error: `That rank now requires at least ${(minimumBid / 100).toFixed(2)} USD. Refresh and try again.`,
        minimumBidCents: minimumBid,
      }, { status: 409 });
    }

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

    const client = createDodoClient();
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
      return_url: buildSponsorCheckoutReturnUrl(appOrigin, pendingClaim.$id),
    });

    return Response.json({ checkoutUrl: session.checkout_url, claimId: pendingClaim.$id });
  } catch (error) {
    console.error("Sponsor checkout failed:", error);
    return Response.json({ error: "Unable to create sponsor checkout." }, { status: 502 });
  }
}
