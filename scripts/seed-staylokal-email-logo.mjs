/**
 * Copy the public email logo asset into the new staylokal_sponsor_logos bucket.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

const bucketId = env.APPWRITE_SPONSOR_BUCKET_ID;
const fileId = "staylokal_email_logo";
const logoBytes = readFileSync(resolve(root, "public", "images", "logo.png"));
const base = env.APPWRITE_ENDPOINT.replace(/\/+$/, "");
const headers = {
  "X-Appwrite-Project": env.APPWRITE_PROJECT_ID,
  "X-Appwrite-Key": env.APPWRITE_API_KEY,
};

const form = new FormData();
form.append("fileId", fileId);
form.append("file", new Blob([logoBytes], { type: "image/png" }), "staylokal-logo.png");
form.append("permissions[]", 'read("any")');

const response = await fetch(`${base}/storage/buckets/${bucketId}/files`, {
  body: form,
  headers,
  method: "POST",
});

if (!response.ok) {
  const text = await response.text();
  if (text.includes("already exists")) {
    console.log("Email logo already present in bucket.");
    process.exit(0);
  }
  console.error(text);
  process.exit(1);
}

console.log(`Uploaded ${fileId} to ${bucketId}.`);
