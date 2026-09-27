import { afterEach, describe, expect, it } from "vitest";
import { buildSponsorCheckoutReturnUrl } from "../lib/sponsors/checkout-return-url";

describe("sponsor checkout return url", () => {
  afterEach(() => {
    delete process.env.DODO_SPONSOR_RETURN_URL;
  });

  it("appends sponsor success params to the app origin", () => {
    const url = buildSponsorCheckoutReturnUrl("http://localhost:3000", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(url).toBe(
      "http://localhost:3000/?sponsor=success&claim_id=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );
  });

  it("merges params into a configured return url", () => {
    process.env.DODO_SPONSOR_RETURN_URL = "https://staylokal.com/?sponsor=success";
    const url = buildSponsorCheckoutReturnUrl("http://localhost:3000", "claim-123");
    expect(url).toBe("https://staylokal.com/?sponsor=success&claim_id=claim-123");
  });
});
