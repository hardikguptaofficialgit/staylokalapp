import { beforeEach, describe, expect, it, vi } from "vitest";

const { activateClaimMock, findClaimByIdMock, retrieveMock } = vi.hoisted(() => ({
  activateClaimMock: vi.fn(),
  findClaimByIdMock: vi.fn(),
  retrieveMock: vi.fn(),
}));

vi.mock("../lib/sponsors/dodo-payments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/sponsors/dodo-payments")>();
  return {
    ...actual,
    createDodoClient: () => ({
      payments: { retrieve: retrieveMock },
    }),
  };
});

vi.mock("../lib/sponsors/appwrite", () => ({
  activateClaim: activateClaimMock,
  appwriteClaimsAreConfigured: () => true,
  findClaimById: findClaimByIdMock,
}));

import { GET } from "../app/api/sponsors/confirm/route";

const claimId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("sponsor confirm route", () => {
  beforeEach(() => {
    process.env.DODO_PAYMENTS_API_KEY = "test-api-key";
    activateClaimMock.mockReset();
    findClaimByIdMock.mockReset();
    retrieveMock.mockReset();
    findClaimByIdMock.mockResolvedValue({ bidCents: 2500, status: "pending" });
    retrieveMock.mockResolvedValue({
      amount: 2500,
      metadata: { claim_id: claimId },
      status: "succeeded",
      total_amount: 2500,
    });
  });

  it("returns activated when claim is already activated", async () => {
    findClaimByIdMock.mockResolvedValue({
      bidCents: 2500,
      paymentId: "pay_12345678",
      status: "activated",
    });

    const response = await GET(new Request("https://example.com/api/sponsors/confirm?claim_id=" + claimId));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ activated: true });
    expect(retrieveMock).not.toHaveBeenCalled();
  });

  it("polls while payment is still processing", async () => {
    retrieveMock.mockResolvedValue({
      amount: 2500,
      metadata: { claim_id: claimId },
      status: "processing",
    });

    const response = await GET(new Request("https://example.com/api/sponsors/confirm?payment_id=pay_12345678"));
    expect(response.status).toBe(202);
    expect(activateClaimMock).not.toHaveBeenCalled();
  });

  it("activates a successful payment", async () => {
    const response = await GET(new Request("https://example.com/api/sponsors/confirm?payment_id=pay_12345678"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ activated: true });
    expect(activateClaimMock).toHaveBeenCalledWith(claimId, "pay_12345678");
  });

  it("returns activated on refresh when the claim is already activated", async () => {
    findClaimByIdMock.mockResolvedValue({
      bidCents: 2500,
      paymentId: "pay_otherpayment",
      status: "activated",
    });

    const response = await GET(new Request("https://example.com/api/sponsors/confirm?payment_id=pay_12345678"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ activated: true });
    expect(activateClaimMock).not.toHaveBeenCalled();
  });

  it("rejects a return URL claim id that does not match payment metadata", async () => {
    const otherClaimId = "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee";
    const response = await GET(new Request(
      `https://example.com/api/sponsors/confirm?payment_id=pay_12345678&claim_id=${otherClaimId}`,
    ));
    expect(response.status).toBe(409);
    expect(activateClaimMock).not.toHaveBeenCalled();
  });

  it("falls back to claim confirmation when payment lookup is missing", async () => {
    retrieveMock.mockRejectedValue({ status: 404, message: "not found" });
    findClaimByIdMock.mockResolvedValue({ bidCents: 2500, status: "activated", paymentId: "pay_12345678" });

    const response = await GET(new Request(
      `https://example.com/api/sponsors/confirm?payment_id=pay_12345678&claim_id=${claimId}`,
    ));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ activated: true });
    expect(activateClaimMock).not.toHaveBeenCalled();
  });

  it("returns conflict when payment lookup fails without a usable claim fallback", async () => {
    retrieveMock.mockRejectedValue({ status: 404, message: "not found" });

    const response = await GET(new Request("https://example.com/api/sponsors/confirm?payment_id=pay_12345678"));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/could not find this payment/i);
  });
});
