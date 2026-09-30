const DODO_CHECKOUT_HOSTS = new Set([
  "checkout.dodopayments.com",
  "test.checkout.dodopayments.com",
]);

export function isDodoCheckoutUrl(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && DODO_CHECKOUT_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
