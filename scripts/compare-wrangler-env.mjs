import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = readFileSync(join(root, "wrangler.jsonc"), "utf8");
const local = readFileSync(join(root, ".env.local"), "utf8");

function fromWranglerVar(key) {
  const m = wrangler.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
  return m?.[1] ?? null;
}

function fromLocal(key) {
  const m = local.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m?.[1]?.trim() ?? null;
}

const keys = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_DATABASE_ID",
  "NEXT_PUBLIC_APP_URL",
  "DODO_SPONSOR_PRODUCT_ID",
  "DODO_DONATION_PRODUCT_ID",
  "DODO_PAYMENTS_ENVIRONMENT",
];

for (const key of keys) {
  const w = fromWranglerVar(key);
  const l = fromLocal(key);
  const match = w && l ? w === l : w === null ? "secret-only" : !l ? "missing-local" : "missing-wrangler-var";
  console.log(`${key}: ${match === true || match === "secret-only" ? "OK" : "CHECK"} (wrangler=${w ?? "—"}, local=${l ?? "—"})`);
}
