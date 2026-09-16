import { describe, expect, it } from "vitest";
import { POST } from "../app/api/donations/checkout/route";
import { donationAmountToCents } from "../lib/donations";

describe("donation amounts", () => {
  it("converts valid USD amounts to cents", () => {
    expect(donationAmountToCents("5")).toBe(500);
    expect(donationAmountToCents(12.34)).toBe(1234);
  });

  it("rejects amounts below five dollars and invalid values", () => {
    expect(donationAmountToCents(4.99)).toBeNull();
    expect(donationAmountToCents("not-an-amount")).toBeNull();
    expect(donationAmountToCents(Infinity)).toBeNull();
  });
});

describe("donation checkout route", () => {
  it("rejects invalid checkout requests before contacting Dodo", async () => {
    const response = await POST(new Request("http://localhost/api/donations/checkout", {
      body: JSON.stringify({ amount: 4 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Donation amount must be at least $5." });
  });
});
