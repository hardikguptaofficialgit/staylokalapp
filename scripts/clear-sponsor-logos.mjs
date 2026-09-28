import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

const bucketId = env.APPWRITE_SPONSOR_BUCKET_ID;
const keep = new Set(["staylokal_email_logo"]);
const headers = {
  "X-Appwrite-Project": env.APPWRITE_PROJECT_ID,
  "X-Appwrite-Key": env.APPWRITE_API_KEY,
};
const base = env.APPWRITE_ENDPOINT.replace(/\/+$/, "");

let deleted = 0;
for (let offset = 0; ; offset += 100) {
  const params = new URLSearchParams();
  params.set("queries[0]", JSON.stringify({ method: "limit", values: [100] }));
  params.set("queries[1]", JSON.stringify({ method: "offset", values: [offset] }));
  const response = await fetch(`${base}/storage/buckets/${bucketId}/files?${params}`, { headers });
  const data = await response.json();
  if (!response.ok) {
    console.error(data);
    process.exit(1);
  }
  const files = data.files ?? [];
  for (const file of files) {
    if (keep.has(file.$id)) continue;
    const del = await fetch(`${base}/storage/buckets/${bucketId}/files/${file.$id}`, {
      headers,
      method: "DELETE",
    });
    if (!del.ok) {
      console.error(`Failed to delete ${file.$id}:`, await del.text());
      process.exit(1);
    }
    deleted += 1;
  }
  if (files.length < 100) break;
}

console.log(`Deleted ${deleted} sponsor logo file(s). Kept staylokal_email_logo.`);
