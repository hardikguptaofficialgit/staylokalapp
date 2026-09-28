import { beforeEach, describe, expect, it, vi } from "vitest";

const { retrieveMock } = vi.hoisted(() => ({
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

import { GET } from "../app/api/donations/confirm/route";

describe("donation confirm route", () => {
  beforeEach(() => {
    process.env.DODO_PAYMENTS_API_KEY = "test-api-key";
    retrieveMock.mockReset();
  });

  it("rejects missing payment id", async () => {
    const response = await GET(new Request("https://example.com/api/donations/confirm"));
    expect(response.status).toBe(400);
  });

  it("verifies succeeded donation payments", async () => {
    retrieveMock.mockResolvedValue({
      metadata: { source: "staylokal-donation" },
      status: "succeeded",
      total_amount: 500,
    });

    const response = await GET(new Request("https://example.com/api/donations/confirm?payment_id=pay_12345678"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ verified: true });
  });

  it("rejects sponsor payments on the donation confirm route", async () => {
    retrieveMock.mockResolvedValue({
      metadata: { claim_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
      status: "succeeded",
      total_amount: 2500,
    });

    const response = await GET(new Request("https://example.com/api/donations/confirm?payment_id=pay_12345678"));
    expect(response.status).toBe(409);
  });

  it("polls while payment is still processing", async () => {
    retrieveMock.mockResolvedValue({
      metadata: { source: "staylokal-donation" },
      status: "processing",
      total_amount: 500,
    });

    const response = await GET(new Request("https://example.com/api/donations/confirm?payment_id=pay_12345678"));
    expect(response.status).toBe(202);
  });
});
