export const MINIMUM_DONATION_CENTS = 500;

export function donationAmountToCents(value: unknown): number | null {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < MINIMUM_DONATION_CENTS / 100) {
    return null;
  }

  const cents = Math.round(amount * 100);
  return cents >= MINIMUM_DONATION_CENTS && cents <= 2_147_483_647 ? cents : null;
}
