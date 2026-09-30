/**
 * Shared Dodo checkout session options for donations and sponsor payments.
 * PWYW cart amounts stay in USD; Adaptive Currency + INR at checkout unlocks UPI for India.
 * @see https://docs.dodopayments.com/features/payment-methods/india
 */
export const STAYLOKAL_CHECKOUT_PAYMENT_METHODS = [
  "credit",
  "debit",
  "upi_intent",
  "apple_pay",
  "google_pay",
] as const;

export function staylokalCheckoutSessionOptions() {
  return {
    allowed_payment_method_types: [...STAYLOKAL_CHECKOUT_PAYMENT_METHODS],
    feature_flags: {
      allow_currency_selection: true,
      allow_phone_number_collection: true,
    },
  };
}
