/**
 * Build .env.test.local from .env.test.local.example + Appwrite vars from .env.local.
 * You still must set DODO_PAYMENTS_API_KEY (test mode) and DODO_PAYMENTS_WEBHOOK_KEY.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const localEnvPath = join(root, ".env.local");
const outPath = join(root, ".env.test.local");

function parseEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    out[line.slice(0, index)] = line.slice(index + 1);
  }
  return out;
}

if (!existsSync(localEnvPath)) {
  console.error("Missing .env.local — copy from .env.example first.");
  process.exit(1);
}

const local = parseEnvFile(localEnvPath);
const copyKeys = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
  "APPWRITE_SPONSORS_TABLE_ID",
  "APPWRITE_CLAIMS_TABLE_ID",
  "APPWRITE_SPONSOR_BUCKET_ID",
  "APPWRITE_MESSAGING_EMAIL_PROVIDER_ID",
  "NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN",
];

const existing = existsSync(outPath) ? parseEnvFile(outPath) : {};

const lines = [
  "# Dodo test mode — Live Mode OFF in dashboard. See docs/sponsor-leaderboard.md",
  "DODO_PAYMENTS_ENVIRONMENT=test_mode",
  `DODO_PAYMENTS_API_KEY=${existing.DODO_PAYMENTS_API_KEY ?? ""}`,
  `DODO_PAYMENTS_WEBHOOK_KEY=${existing.DODO_PAYMENTS_WEBHOOK_KEY ?? ""}`,
  "DODO_SPONSOR_PRODUCT_ID=pdt_0NneHBMUPJHxxUZqj6BIc",
  "DODO_DONATION_PRODUCT_ID=pdt_0NneGQ08GrJZXgme3syHw",
  "NEXT_PUBLIC_APP_URL=http://localhost:3000",
  "DODO_PAYMENTS_RETURN_URL=http://localhost:3000/donate",
  "DODO_SPONSOR_RETURN_URL=http://localhost:3000/?sponsor=success",
  "",
  ...copyKeys.map((key) => `${key}=${local[key] ?? ""}`),
];

writeFileSync(outPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${outPath}`);
