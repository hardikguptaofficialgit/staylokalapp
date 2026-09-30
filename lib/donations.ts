export const MINIMUM_DONATION_CENTS = 500;
export const MAXIMUM_DONATION_CENTS = 1_000_000;

export function donationAmountToCents(value: unknown): number | null {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < MINIMUM_DONATION_CENTS / 100) {
    return null;
  }

  const cents = Math.round(amount * 100);
  return cents >= MINIMUM_DONATION_CENTS && cents <= MAXIMUM_DONATION_CENTS ? cents : null;
}
