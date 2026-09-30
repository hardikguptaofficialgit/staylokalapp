import { describe, expect, it } from "vitest";
import { isDodoCheckoutUrl } from "../lib/app/checkout-url";

describe("isDodoCheckoutUrl", () => {
  it("accepts live and test Dodo checkout hosts", () => {
    expect(isDodoCheckoutUrl("https://checkout.dodopayments.com/session/cks_test")).toBe(true);
    expect(isDodoCheckoutUrl("https://test.checkout.dodopayments.com/session/cks_test")).toBe(true);
  });

  it("rejects open redirects and non-https URLs", () => {
    expect(isDodoCheckoutUrl("https://evil.example/phish")).toBe(false);
    expect(isDodoCheckoutUrl("http://checkout.dodopayments.com/session/x")).toBe(false);
    expect(isDodoCheckoutUrl("javascript:alert(1)")).toBe(false);
  });
});
