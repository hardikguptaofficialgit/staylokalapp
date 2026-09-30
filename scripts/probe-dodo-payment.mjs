import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import DodoPayments from "dodopayments";

const paymentId = process.argv[2]?.trim();
if (!paymentId) {
  console.error("Usage: node scripts/probe-dodo-payment.mjs <payment_id>");
  process.exit(1);
}

const path = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

const key = env.DODO_PAYMENTS_API_KEY?.trim();
const mode = env.DODO_PAYMENTS_ENVIRONMENT?.trim() === "test_mode" ? "test_mode" : "live_mode";
const client = new DodoPayments({ bearerToken: key, environment: mode });

try {
  const payment = await client.payments.retrieve(paymentId);
  console.log(JSON.stringify({
    environment: mode,
    status: payment.status,
    currency: payment.currency,
    charge_usd_cents: payment.metadata?.charge_usd_cents,
    claim_id: payment.metadata?.claim_id,
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ environment: mode, error: error.status ?? String(error) }, null, 2));
  process.exit(1);
}
