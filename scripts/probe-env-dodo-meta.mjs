import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const path = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
const t = readFileSync(path, "utf8");
for (const k of ["DODO_PAYMENTS_ENVIRONMENT", "DODO_SPONSOR_PRODUCT_ID"]) {
  const m = t.match(new RegExp(`^${k}=(.*)$`, "m"));
  console.log(`${k}: ${m ? m[1].trim() : "missing"}`);
}
const m = t.match(/^DODO_PAYMENTS_API_KEY=(.*)$/m);
const v = m ? m[1].trim() : "";
console.log(`API_KEY len: ${v.length}`);
console.log(`API_KEY wrapped in quotes: ${/^["']/.test(v)}`);
console.log(`API_KEY prefix: ${v.slice(0, 15)}…`);
