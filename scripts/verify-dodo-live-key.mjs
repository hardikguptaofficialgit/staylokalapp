import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import DodoPayments from "dodopayments";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, ".env.local");

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

if (!existsSync(path)) {
  console.error("No .env.local");
  process.exit(1);
}

const env = parseEnv(readFileSync(path, "utf8"));
const key = env.DODO_PAYMENTS_API_KEY?.trim();
const environment = env.DODO_PAYMENTS_ENVIRONMENT?.trim() || "live_mode";
const sponsorProduct = env.DODO_SPONSOR_PRODUCT_ID?.trim();
const donationProduct = env.DODO_DONATION_PRODUCT_ID?.trim();

if (!key) {
  console.error("DODO_PAYMENTS_API_KEY empty");
  process.exit(1);
}
if (environment !== "live_mode") {
  console.error("DODO_PAYMENTS_ENVIRONMENT is not live_mode in .env.local");
  process.exit(1);
}

const client = new DodoPayments({ bearerToken: key, environment: "live_mode" });
const products = [];
for await (const product of client.products.list({ page_size: 20 })) {
  products.push({ id: product.product_id, name: product.name });
}

const sponsorOk = sponsorProduct && products.some((p) => p.id === sponsorProduct);
const donationOk = donationProduct && products.some((p) => p.id === donationProduct);

console.log(
  JSON.stringify(
    {
      environment: "live_mode",
      productsFound: products.length,
      sponsorProductConfigured: Boolean(sponsorProduct),
      sponsorProductInCatalog: sponsorOk,
      donationProductConfigured: Boolean(donationProduct),
      donationProductInCatalog: donationOk,
      catalog: products.map((p) => p.id),
    },
    null,
    2,
  ),
);

if (!sponsorOk || !donationOk) process.exit(1);
