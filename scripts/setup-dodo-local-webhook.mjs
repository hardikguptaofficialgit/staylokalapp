/**
 * Register (or update) a Dodo test-mode webhook for a public tunnel URL + write secret to .env.test.local.
 * Usage: node scripts/setup-dodo-local-webhook.mjs <https://your-tunnel-host>
 * (Cloudflare: https://….trycloudflare.com — or localtunnel: https://….loca.lt)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import DodoPayments from "dodopayments";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.test.local");
const tunnelBase = process.argv[2]?.trim().replace(/\/$/, "");

if (!tunnelBase || !/^https:\/\/.+/.test(tunnelBase)) {
  console.error("Usage: node scripts/setup-dodo-local-webhook.mjs https://your-tunnel-host");
  process.exit(1);
}

const webhookUrl = `${tunnelBase}/api/webhooks/dodo`;

function parseEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

if (!existsSync(envPath)) {
  console.error("Missing .env.test.local");
  process.exit(1);
}

const apiKey = parseEnv(envPath).DODO_PAYMENTS_API_KEY?.trim();
if (!apiKey) {
  console.error("DODO_PAYMENTS_API_KEY empty in .env.test.local");
  process.exit(1);
}

const client = new DodoPayments({ bearerToken: apiKey, environment: "test_mode" });

let webhookId;
for await (const wh of client.webhooks.list()) {
  const localDev =
    wh.description === "StayLokal local dev tunnel" || wh.description === "StayLokal localtunnel";
  if (wh.url === webhookUrl || localDev) {
    webhookId = wh.id;
    await client.webhooks.update(webhookId, {
      url: webhookUrl,
      description: "StayLokal local dev tunnel",
      disabled: false,
      filter_types: ["payment.succeeded", "payment.failed"],
    });
    console.log("Updated webhook", webhookId);
    break;
  }
}

if (!webhookId) {
  const created = await client.webhooks.create({
    url: webhookUrl,
    description: "StayLokal local dev tunnel",
    filter_types: ["payment.succeeded", "payment.failed"],
  });
  webhookId = created.id;
  console.log("Created webhook", webhookId);
}

const { secret } = await client.webhooks.retrieveSecret(webhookId);
if (!secret?.trim()) {
  console.error("No webhook secret returned");
  process.exit(1);
}

const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
let found = false;
const next = lines.map((line) => {
  if (line.startsWith("DODO_PAYMENTS_WEBHOOK_KEY=")) {
    found = true;
    return `DODO_PAYMENTS_WEBHOOK_KEY=${secret.trim()}`;
  }
  return line;
});
if (!found) {
  next.splice(2, 0, `DODO_PAYMENTS_WEBHOOK_KEY=${secret.trim()}`);
}
writeFileSync(envPath, `${next.join("\n").replace(/\n*$/, "")}\n`);
console.log("Wrote DODO_PAYMENTS_WEBHOOK_KEY to .env.test.local");
console.log("Webhook URL:", webhookUrl);
