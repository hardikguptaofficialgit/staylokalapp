import { describe, expect, it } from "vitest";
import {
  STAYLOKAL_CHECKOUT_PAYMENT_METHODS,
  staylokalCheckoutSessionOptions,
} from "../lib/payments/dodo-checkout-session";

describe("staylokal checkout session options", () => {
  it("includes UPI and card fallbacks for global checkout", () => {
    expect(STAYLOKAL_CHECKOUT_PAYMENT_METHODS).toContain("upi_intent");
    expect(STAYLOKAL_CHECKOUT_PAYMENT_METHODS).toContain("credit");
    expect(STAYLOKAL_CHECKOUT_PAYMENT_METHODS).toContain("debit");
  });

  it("enables currency and phone collection for localized methods", () => {
    const options = staylokalCheckoutSessionOptions();
    expect(options.feature_flags?.allow_currency_selection).toBe(true);
    expect(options.feature_flags?.allow_phone_number_collection).toBe(true);
  });
});
