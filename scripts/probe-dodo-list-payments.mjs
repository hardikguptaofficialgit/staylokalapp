import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import DodoPayments from "dodopayments";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = process.argv[2] === "--test" ? ".env.test.local" : ".env.local";
const env = Object.fromEntries(
  readFileSync(join(root, envPath), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

const mode = env.DODO_PAYMENTS_ENVIRONMENT?.trim() === "test_mode" ? "test_mode" : "live_mode";
const client = new DodoPayments({
  bearerToken: env.DODO_PAYMENTS_API_KEY?.trim(),
  environment: mode,
});

const ids = [];
for await (const p of client.payments.list({ limit: 5 })) {
  ids.push(p.payment_id ?? p.id);
}
console.log(JSON.stringify({ file: envPath, environment: mode, recentPaymentIds: ids }, null, 2));
