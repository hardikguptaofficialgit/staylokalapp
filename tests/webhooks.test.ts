import { beforeEach, describe, expect, it, vi } from "vitest";

const { activateClaimMock, findClaimByIdMock, retrieveMock, unwrapMock } = vi.hoisted(() => ({
  activateClaimMock: vi.fn(),
  findClaimByIdMock: vi.fn(),
  retrieveMock: vi.fn(),
  unwrapMock: vi.fn(),
}));

vi.mock("../lib/sponsors/dodo-payments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/sponsors/dodo-payments")>();
  return {
    ...actual,
    createDodoClient: () => ({
      payments: { retrieve: retrieveMock },
      webhooks: { unwrap: unwrapMock },
    }),
  };
});

const listActiveSponsorsMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/sponsors/appwrite", () => ({
  activateClaim: activateClaimMock,
  findClaimById: findClaimByIdMock,
  listActiveSponsors: listActiveSponsorsMock,
}));

import { POST } from "../app/api/webhooks/dodo/route";

const claimId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("Dodo sponsor webhook", () => {
  beforeEach(() => {
    process.env.DODO_PAYMENTS_API_KEY = "test-api-key";
    process.env.DODO_PAYMENTS_WEBHOOK_KEY = "test-webhook-key";
    process.env.DODO_PAYMENTS_ENVIRONMENT = "test_mode";
    activateClaimMock.mockReset();
    findClaimByIdMock.mockReset();
    retrieveMock.mockReset();
    unwrapMock.mockReset();
    listActiveSponsorsMock.mockResolvedValue([]);
    findClaimByIdMock.mockResolvedValue({
      bidCents: 401,
      destinationUrl: "https://example.com/",
      status: "pending",
    });
    retrieveMock.mockResolvedValue({
      amount: 401,
      metadata: { claim_id: claimId },
      status: "succeeded",
    });
  });

  it("rejects an empty body", async () => {
    const response = await POST(new Request("https://example.com/webhook", { method: "POST" }));
    expect(response.status).toBe(400);
    expect(unwrapMock).not.toHaveBeenCalled();
  });

  it("acknowledges unrelated payment events without activating a claim", async () => {
    unwrapMock.mockReturnValue({ type: "payment.failed", data: {} });
    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));
    expect(response.status).toBe(200);
    expect(activateClaimMock).not.toHaveBeenCalled();
  });

  it("acknowledges donation payments without sponsor claim metadata", async () => {
    retrieveMock.mockResolvedValue({
      amount: 500,
      metadata: { source: "staylokal-donation" },
      status: "succeeded",
    });
    unwrapMock.mockReturnValue({
      type: "payment.succeeded",
      data: { metadata: { source: "staylokal-donation" }, payment_id: "pay_12345678" },
    });
    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));
    expect(response.status).toBe(200);
    expect(activateClaimMock).not.toHaveBeenCalled();
  });

  it("resolves claim id from payment when event claim metadata is malformed", async () => {
    unwrapMock.mockReturnValue({
      type: "payment.succeeded",
      data: { metadata: { claim_id: "claim-1" }, payment_id: "pay_12345678" },
    });
    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));
    expect(response.status).toBe(200);
    expect(activateClaimMock).toHaveBeenCalledWith(claimId, "pay_12345678");
  });

  it("rejects successful events without payment id or sponsor claim", async () => {
    unwrapMock.mockReturnValue({ type: "payment.succeeded", data: { metadata: {} } });
    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));
    expect(response.status).toBe(400);
    expect(activateClaimMock).not.toHaveBeenCalled();
  });

  it("rejects successful events when payment record has no sponsor claim", async () => {
    unwrapMock.mockReturnValue({
      type: "payment.succeeded",
      data: { payment_id: "pay_12345678" },
    });
    retrieveMock.mockResolvedValue({ amount: 401, metadata: {}, status: "succeeded" });
    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));
    expect(response.status).toBe(400);
    expect(activateClaimMock).not.toHaveBeenCalled();
  });

  it("activates when claim id exists only on the payment record", async () => {
    unwrapMock.mockReturnValue({
      type: "payment.succeeded",
      data: { payment_id: "pay_12345678" },
    });
    retrieveMock.mockResolvedValue({
      amount: 401,
      currency: "INR",
      metadata: { claim_id: claimId, charge_usd_cents: "401" },
      status: "succeeded",
      total_amount: 33_000,
    });
    findClaimByIdMock.mockResolvedValue({
      bidCents: 401,
      destinationUrl: "https://example.com/",
      status: "pending",
    });

    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));

    expect(response.status).toBe(200);
    expect(activateClaimMock).toHaveBeenCalledWith(claimId, "pay_12345678");
  });

  it("returns a retryable error when activation fails", async () => {
    unwrapMock.mockReturnValue({
      type: "payment.succeeded",
      data: { metadata: { claim_id: claimId }, payment_id: "pay_12345678" },
    });
    activateClaimMock.mockRejectedValue(new Error("temporary Appwrite failure"));

    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Sponsor activation will be retried." });
  });

  it("acknowledges duplicate success webhooks when the claim is already activated", async () => {
    findClaimByIdMock.mockResolvedValue({ bidCents: 401, status: "activated" });
    unwrapMock.mockReturnValue({
      type: "payment.succeeded",
      data: { metadata: { claim_id: claimId }, payment_id: "pay_12345678" },
    });

    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));

    expect(response.status).toBe(200);
    expect(activateClaimMock).not.toHaveBeenCalled();
    expect(retrieveMock).not.toHaveBeenCalled();
  });

  it("activates a sponsor claim from payment metadata", async () => {
    unwrapMock.mockReturnValue({
      type: "payment.succeeded",
      data: { metadata: { claim_id: claimId }, payment_id: "pay_12345678" },
    });

    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));

    expect(response.status).toBe(200);
    expect(findClaimByIdMock).toHaveBeenCalledWith(claimId);
    expect(retrieveMock).toHaveBeenCalledWith("pay_12345678", { signal: expect.any(AbortSignal) });
    expect(activateClaimMock).toHaveBeenCalledWith(claimId, "pay_12345678");
  });
});
