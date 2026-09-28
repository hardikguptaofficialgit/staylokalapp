/**
 * Push server env vars from .env.local to the staylokal Cloudflare Worker.
 * Requires: wrangler logged into the account that owns staylokal.app.
 *
 * Usage: node scripts/sync-wrangler-secrets.mjs
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const wranglerText = readFileSync(resolve(root, "wrangler.jsonc"), "utf8");
const workerMatch = wranglerText.match(/"name"\s*:\s*"([^"]+)"/);
const workerName = workerMatch?.[1] ?? "staylokal";

const SECRET_KEYS = [
  "APPWRITE_API_KEY",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_DATABASE_ID",
  "APPWRITE_SPONSORS_TABLE_ID",
  "APPWRITE_CLAIMS_TABLE_ID",
  "APPWRITE_SPONSOR_BUCKET_ID",
  "APPWRITE_ENDPOINT",
  "APPWRITE_MESSAGING_EMAIL_PROVIDER_ID",
  "DODO_PAYMENTS_API_KEY",
  "DODO_PAYMENTS_ENVIRONMENT",
  "DODO_PAYMENTS_WEBHOOK_KEY",
  "DODO_DONATION_PRODUCT_ID",
  "DODO_SPONSOR_PRODUCT_ID",
  "DODO_PAYMENTS_RETURN_URL",
  "DODO_SPONSOR_RETURN_URL",
  // NEXT_PUBLIC_APP_URL is set in wrangler.jsonc `vars` (cannot duplicate as secret)
];

function parseEnvFile(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    map.set(key, value);
  }
  return map;
}

const env = parseEnvFile(readFileSync(envPath, "utf8"));
const missing = SECRET_KEYS.filter((key) => !env.get(key)?.trim());
if (missing.length) {
  console.error("Missing in .env.local:", missing.join(", "));
  process.exit(1);
}

for (const key of SECRET_KEYS) {
  const value = env.get(key);
  console.log(`Setting secret ${key}...`);
  const result = spawnSync(
    "npx",
    ["wrangler", "secret", "put", key, "--name", workerName],
    {
      cwd: root,
      input: value,
      encoding: "utf8",
      shell: true,
      stdio: ["pipe", "inherit", "inherit"],
    },
  );
  if (result.status !== 0) {
    console.error(`Failed to set ${key}. Is wrangler logged into the staylokal.app account?`);
    process.exit(result.status ?? 1);
  }
}

console.log("Done. Redeploy if needed: npm run deploy");
