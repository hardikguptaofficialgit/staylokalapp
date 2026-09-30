/**
 * Read-only prod checks: Dodo lookup + Appwrite claim confirm (no charges).
 */
const base = (process.env.PAYMENTS_SMOKE_BASE_URL ?? "https://staylokal.app").replace(/\/+$/, "");
const paymentId = process.argv[2]?.trim();
const claimId = process.argv[3]?.trim();

async function get(path) {
  const response = await fetch(`${base}${path}`);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

console.log(`Base: ${base}\n`);

if (claimId) {
  const byClaim = await get(`/api/sponsors/confirm?claim_id=${encodeURIComponent(claimId)}`);
  console.log("confirm by claim_id:", byClaim.status, JSON.stringify(byClaim.body));
}

if (paymentId) {
  const byPayment = await get(`/api/sponsors/confirm?payment_id=${encodeURIComponent(paymentId)}`);
  console.log("confirm by payment_id:", byPayment.status, JSON.stringify(byPayment.body));
  if (byPayment.status === 409 && /could not find this payment/i.test(String(byPayment.body?.error))) {
    console.log(
      "\nLikely cause: Worker DODO_PAYMENTS_ENVIRONMENT or API key does not match LIVE payments.",
    );
    console.log("Set DODO_PAYMENTS_ENVIRONMENT=live_mode and live API key in Cloudflare Worker secrets.");
  }
}

if (!paymentId && !claimId) {
  console.error("Usage: node scripts/probe-prod-payment-env.mjs <payment_id> [claim_id]");
  process.exit(1);
}
