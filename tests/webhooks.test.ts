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

vi.mock("../lib/sponsors/appwrite", () => ({
  activateClaim: activateClaimMock,
  findClaimById: findClaimByIdMock,
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
    findClaimByIdMock.mockResolvedValue({ bidCents: 401 });
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

  it("rejects successful events with malformed claim ids", async () => {
    unwrapMock.mockReturnValue({
      type: "payment.succeeded",
      data: { metadata: { claim_id: "claim-1" }, payment_id: "pay_12345678" },
    });
    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));
    expect(response.status).toBe(400);
    expect(activateClaimMock).not.toHaveBeenCalled();
  });

  it("rejects successful events without sponsor payment metadata", async () => {
    unwrapMock.mockReturnValue({ type: "payment.succeeded", data: { metadata: {} } });
    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));
    expect(response.status).toBe(400);
    expect(activateClaimMock).not.toHaveBeenCalled();
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
