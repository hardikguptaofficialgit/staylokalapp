import { beforeEach, describe, expect, it, vi } from "vitest";

const { activateClaimMock, unwrapMock } = vi.hoisted(() => ({
  activateClaimMock: vi.fn(),
  unwrapMock: vi.fn(),
}));

vi.mock("dodopayments", () => ({
  default: class {
    webhooks = { unwrap: unwrapMock };
  },
}));

vi.mock("../lib/sponsors/appwrite", () => ({
  activateClaim: activateClaimMock,
}));

import { POST } from "../app/api/webhooks/dodo/route";

describe("Dodo sponsor webhook", () => {
  beforeEach(() => {
    process.env.DODO_PAYMENTS_API_KEY = "test-api-key";
    process.env.DODO_PAYMENTS_WEBHOOK_KEY = "test-webhook-key";
    process.env.DODO_PAYMENTS_ENVIRONMENT = "test_mode";
    activateClaimMock.mockReset();
    unwrapMock.mockReset();
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

  it("returns a retryable error when activation fails", async () => {
    unwrapMock.mockReturnValue({
      type: "payment.succeeded",
      data: { metadata: { claim_id: "claim-1" }, payment_id: "pay-1" },
    });
    activateClaimMock.mockRejectedValue(new Error("temporary Appwrite failure"));

    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Sponsor activation will be retried." });
  });

  it("activates a sponsor claim from payment metadata", async () => {
    unwrapMock.mockReturnValue({
      type: "payment.succeeded",
      data: { metadata: { claim_id: "claim-1" }, payment_id: "pay-1" },
    });

    const response = await POST(new Request("https://example.com/webhook", {
      body: "{}",
      method: "POST",
    }));

    expect(response.status).toBe(200);
    expect(activateClaimMock).toHaveBeenCalledWith("claim-1", "pay-1");
  });
});
