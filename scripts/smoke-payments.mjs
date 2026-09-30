/**
 * Read-only production (or local) payment API smoke checks. No checkout, no charges.
 *
 * Usage:
 *   node scripts/smoke-payments.mjs
 *   PAYMENTS_SMOKE_BASE_URL=http://localhost:3000 node scripts/smoke-payments.mjs
 */
const base = (process.env.PAYMENTS_SMOKE_BASE_URL ?? "https://staylokal.app").replace(/\/+$/, "");

async function check(name, url, init, expectStatus) {
  const response = await fetch(url, init);
  const body = await response.text();
  const ok = response.status === expectStatus;
  const preview = body.length > 120 ? `${body.slice(0, 120)}…` : body;
  console.log(`${ok ? "OK" : "FAIL"} ${name}: ${response.status} ${preview}`);
  return ok;
}

let passed = 0;
let failed = 0;

async function run() {
  console.log(`Base: ${base}\n`);

  if (await check("leaderboard", `${base}/api/sponsors/leaderboard`, undefined, 200)) passed += 1;
  else failed += 1;

  if (await check("donations confirm (no id)", `${base}/api/donations/confirm`, undefined, 400)) passed += 1;
  else failed += 1;

  if (await check("sponsors confirm (no id)", `${base}/api/sponsors/confirm`, undefined, 400)) passed += 1;
  else failed += 1;

  if (
    await check(
      "dodo webhook (unsigned)",
      `${base}/api/webhooks/dodo`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      400,
    )
  ) passed += 1;
  else failed += 1;

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
