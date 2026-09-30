export const SPONSOR_CLAIM_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function isSponsorClaimId(value: unknown): boolean {
  return typeof value === "string" && SPONSOR_CLAIM_ID_PATTERN.test(value.trim());
}
