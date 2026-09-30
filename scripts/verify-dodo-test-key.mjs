import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import DodoPayments from "dodopayments";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, ".env.test.local");

if (!existsSync(path)) {
  console.error("No .env.test.local");
  process.exit(1);
}

const key = readFileSync(path, "utf8")
  .split(/\r?\n/)
  .find((line) => line.startsWith("DODO_PAYMENTS_API_KEY="))
  ?.split("=")
  .slice(1)
  .join("=")
  ?.trim();

if (!key) {
  console.error("DODO_PAYMENTS_API_KEY is empty in .env.test.local");
  process.exit(1);
}

const client = new DodoPayments({ bearerToken: key, environment: "test_mode" });
const products = [];
for await (const product of client.products.list({ page_size: 10 })) {
  products.push({ id: product.product_id, name: product.name });
}
console.log("test_mode OK", JSON.stringify(products, null, 2));
