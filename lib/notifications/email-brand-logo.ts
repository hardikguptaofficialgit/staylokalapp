import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOGO_FILE_ID = "staylokal_email_logo";
const LOGO_PATH = join(process.cwd(), "app", "icon.png");

function readLogoBytes() {
  const publicLogo = join(process.cwd(), "public", "images", "logo.png");
  const path = existsSync(LOGO_PATH) ? LOGO_PATH : publicLogo;
  return readFileSync(path);
}

let cachedLogoUrl: string | null = null;

function appwriteUrl(path: string) {
  const endpoint = process.env.APPWRITE_ENDPOINT!.replace(/\/+$/, "").replace(/\/v1$/, "");
  return `${endpoint}${path}`;
}

function isPublicHttpsOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && !["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function resolvePublicEmailAssetOrigin(): string | null {
  const candidates = [
    process.env.SPONSOR_EMAIL_ASSET_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "")}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}` : undefined,
  ];

  for (const candidate of candidates) {
    const origin = candidate?.trim().replace(/\/+$/, "");
    if (origin && isPublicHttpsOrigin(origin)) return origin;
  }
  return null;
}

export function resolveEmailLinkOrigin() {
  return resolvePublicEmailAssetOrigin()
    ?? (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
}

function publicAssetUrl(path: string) {
  const origin = resolvePublicEmailAssetOrigin();
  if (!origin) return null;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function storageViewUrl(bucketId: string, fileId: string) {
  const endpoint = process.env.APPWRITE_ENDPOINT!.replace(/\/+$/, "");
  return `${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/view?project=${encodeURIComponent(process.env.APPWRITE_PROJECT_ID!)}`;
}

function logoDataUrl() {
  return `data:image/png;base64,${readLogoBytes().toString("base64")}`;
}

async function appwriteRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("X-Appwrite-Project", process.env.APPWRITE_PROJECT_ID!);
  headers.set("X-Appwrite-Key", process.env.APPWRITE_API_KEY!);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(appwriteUrl(path), { ...init, headers });
  if (!response.ok) {
    const error = new Error(`Appwrite storage request failed (${response.status})`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response;
}

async function ensureAppwriteHostedLogoUrl(): Promise<string | null> {
  const bucketId = process.env.APPWRITE_SPONSOR_BUCKET_ID?.trim();
  if (
    !bucketId
    || !process.env.APPWRITE_ENDPOINT
    || !process.env.APPWRITE_PROJECT_ID
    || !process.env.APPWRITE_API_KEY
  ) {
    return null;
  }

  const view = storageViewUrl(bucketId, LOGO_FILE_ID);
  try {
    await appwriteRequest(`/v1/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(LOGO_FILE_ID)}`);
    return view;
  } catch (error) {
    if ((error as { status?: number }).status !== 404) throw error;
  }

  const bytes = readLogoBytes();
  const form = new FormData();
  form.append("fileId", LOGO_FILE_ID);
  form.append("permissions[]", 'read("any")');
  form.append("file", new Blob([bytes], { type: "image/png" }), "staylokal-logo.png");

  try {
    await appwriteRequest(`/v1/storage/buckets/${encodeURIComponent(bucketId)}/files`, {
      method: "POST",
      body: form,
    });
  } catch (error) {
    if ((error as { status?: number }).status !== 409) throw error;
  }

  return view;
}

/** HTTPS URL Gmail and other clients can load (never localhost). */
export async function resolveSponsorEmailLogoUrl(): Promise<string> {
  const configured = process.env.SPONSOR_EMAIL_LOGO_URL?.trim();
  if (configured) return configured;

  if (cachedLogoUrl) return cachedLogoUrl;

  const publicSiteLogo = publicAssetUrl("/images/logo.png");
  if (publicSiteLogo) {
    cachedLogoUrl = publicSiteLogo;
    return publicSiteLogo;
  }

  try {
    const hosted = await ensureAppwriteHostedLogoUrl();
    if (hosted) {
      cachedLogoUrl = hosted;
      return hosted;
    }
  } catch (error) {
    console.warn("Unable to host sponsor email logo in Appwrite Storage:", error);
  }

  return logoDataUrl();
}
