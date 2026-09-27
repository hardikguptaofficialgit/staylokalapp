export function buildSponsorCheckoutReturnUrl(appOrigin: string, claimId: string) {
  const configured = process.env.DODO_SPONSOR_RETURN_URL?.trim();
  const url = new URL(configured || `${appOrigin.replace(/\/+$/, "")}/`);
  url.searchParams.set("sponsor", "success");
  url.searchParams.set("claim_id", claimId);
  return url.toString();
}
