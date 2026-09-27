import { describe, expect, it } from "vitest";
import {
  assertSponsorPaymentMatchesClaim,
  claimBidCents,
  paymentAmountCents,
  paymentBidCents,
  resolvedSponsorBidCents,
} from "../lib/sponsors/dodo-payments";

describe("dodo sponsor payment verification", () => {
  it("accepts matching successful payments", () => {
    expect(() => assertSponsorPaymentMatchesClaim({
      amount: 401,
      metadata: { claim_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
      status: "succeeded",
    }, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", 401)).not.toThrow();
  });

  it("rejects mismatched rank metadata when provided", () => {
    const claimId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    expect(() => assertSponsorPaymentMatchesClaim({
      amount: 401,
      metadata: { claim_id: claimId, target_rank: "2" },
      status: "succeeded",
    }, claimId, 401, { targetRank: 1 })).toThrow(/rank/i);
  });

  it("skips rank verification when payment metadata omits target_rank", () => {
    const claimId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    expect(() => assertSponsorPaymentMatchesClaim({
      amount: 401,
      metadata: { claim_id: claimId },
      status: "succeeded",
    }, claimId, 401, { targetRank: 1 })).not.toThrow();
  });

  it("rejects mismatched claim or amount", () => {
    expect(() => assertSponsorPaymentMatchesClaim({
      amount: 400,
      metadata: { claim_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
      status: "succeeded",
    }, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", 401)).toThrow(/amount/i);
    expect(() => assertSponsorPaymentMatchesClaim({
      amount: 401,
      metadata: { claim_id: "other" },
      status: "succeeded",
    }, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", 401)).toThrow(/claim/i);
  });

  it("reads total_amount when present", () => {
    expect(paymentAmountCents({ total_amount: 500 })).toBe(500);
  });

  it("reads bid cents from claim rows with numeric strings", () => {
    expect(claimBidCents({ bidCents: "401" })).toBe(401);
    expect(claimBidCents({ bidCents: 100.9 })).toBe(101);
  });

  it("subtracts tax when matching sponsor bid", () => {
    const payment = {
      metadata: { bid: "$1.00", claim_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
      status: "succeeded",
      tax: 18,
      total_amount: 118,
    };
    expect(paymentBidCents(payment)).toBe(100);
    expect(resolvedSponsorBidCents(payment)).toBe(100);
    expect(() => assertSponsorPaymentMatchesClaim(
      payment,
      "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      100,
    )).not.toThrow();
  });
});
