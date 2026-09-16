import {
  MINIMUM_SPONSOR_BID_CENTS,
  SPONSOR_CATEGORIES,
  type SponsorClaimInput,
  type SponsorCategory,
  type ValidatedSponsorClaim,
} from "./types";

const HANDLE_PATTERN = /^@?[a-zA-Z0-9._-]{2,64}$/;
const MAX_LOGO_BYTES = 512 * 1024;

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 && result.length <= maxLength ? result : null;
}

function destination(value: unknown): { url: string; handle?: string } | null {
  const raw = text(value, 300);
  if (!raw) return null;

  if (HANDLE_PATTERN.test(raw)) {
    const handle = raw.startsWith("@") ? raw : `@${raw}`;
    return { handle, url: `https://x.com/${handle.slice(1)}` };
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !url.hostname) return null;
    return { url: url.toString() };
  } catch {
    return null;
  }
}

function category(value: unknown): SponsorCategory | null {
  return typeof value === "string" && SPONSOR_CATEGORIES.includes(value as SponsorCategory)
    ? value as SponsorCategory
    : null;
}

function logoDataUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(value);
  if (!match) return undefined;
  const bytes = Math.floor((match[2].length * 3) / 4);
  return bytes <= MAX_LOGO_BYTES ? value : undefined;
}

export function validateSponsorClaim(input: SponsorClaimInput): ValidatedSponsorClaim | null {
  const companyName = text(input.companyName, 80);
  const description = text(input.description, 160);
  const bidCents = typeof input.bidCents === "number" ? input.bidCents : Number(input.bidCents);
  const target = destination(input.destination);
  const selectedCategory = category(input.category);

  if (!companyName || !description || !target || !selectedCategory) return null;
  if (!Number.isSafeInteger(bidCents) || bidCents < MINIMUM_SPONSOR_BID_CENTS || bidCents > 2_147_483_647) {
    return null;
  }

  return {
    bidCents,
    category: selectedCategory,
    companyName,
    description,
    destinationUrl: target.url,
    ...(target.handle ? { handle: target.handle } : {}),
    ...(logoDataUrl(input.logoDataUrl) ? { logoDataUrl: logoDataUrl(input.logoDataUrl) } : {}),
  };
}
