/**
 * Insert or refresh an active sponsor row in Appwrite (no Dodo charge).
 * Usage: node scripts/seed-sponsor.mjs
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvFile(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

const env = parseEnvFile(readFileSync(resolve(root, ".env.local"), "utf8"));

const endpoint = (env.get("APPWRITE_ENDPOINT") ?? "").replace(/\/v1\/?$/, "");
const projectId = env.get("APPWRITE_PROJECT_ID");
const apiKey = env.get("APPWRITE_API_KEY");
const databaseId = env.get("APPWRITE_DATABASE_ID");
const tableId = env.get("APPWRITE_SPONSORS_TABLE_ID") ?? "staylokal_sponsors";

const destinationUrl = "https://linkitapp.in/";
const sponsor = {
  bidCents: 100,
  category: "Productivity & Personal Tools",
  claimId: randomUUID(),
  companyName: "LinkItApp",
  description: "Your links, one clean page.",
  destinationUrl,
  handle: "",
  logoUrl: "",
  paidAt: new Date().toISOString(),
  paymentId: "pay_manual_linkitapp_seed",
  status: "active",
};

if (!endpoint || !projectId || !apiKey || !databaseId) {
  console.error("Missing Appwrite env in .env.local");
  process.exit(1);
}

function appwriteUrl(path) {
  return `${endpoint}${path}`;
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("X-Appwrite-Project", projectId);
  headers.set("X-Appwrite-Key", apiKey);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(appwriteUrl(path), { ...init, headers });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`Appwrite ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
}

const rowsPath = `/v1/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableId)}/rows`;

const existing = await request(`${rowsPath}?queries[0]=${encodeURIComponent(JSON.stringify({
  method: "equal",
  attribute: "status",
  values: ["active"],
}))}&queries[1]=${encodeURIComponent(JSON.stringify({ method: "limit", values: [100] }))}`);

const match = (existing.rows ?? []).find((row) => String(row.destinationUrl ?? "").includes("linkitapp.in"));

if (match) {
  const updated = await request(`${rowsPath}/${encodeURIComponent(match.$id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: {
        ...sponsor,
        claimId: match.claimId || sponsor.claimId,
      },
    }),
  });
  console.log("Updated existing LinkItApp sponsor:", updated.$id ?? match.$id);
} else {
  const rowId = randomUUID();
  const created = await request(rowsPath, {
    method: "POST",
    body: JSON.stringify({ rowId, data: sponsor }),
  });
  console.log("Created LinkItApp sponsor:", created.$id ?? rowId);
}

console.log("Bid: $1.00 · URL:", destinationUrl);
