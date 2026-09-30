import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSponsorCheckoutReturnUrl } from "../lib/sponsors/checkout-return-url";
import { activationOutcome, minimumBidForRank } from "../lib/sponsors/ranking";
import { validateSponsorClaim } from "../lib/sponsors/validation";
import type { SponsorRecord } from "../lib/sponsors/types";

const claimId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

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
  appwriteClaimsAreConfigured: () => true,
  findClaimById: findClaimByIdMock,
  isAppwriteRowNotFound: () => false,
  listActiveSponsors: listActiveSponsorsMock,
}));

import { GET as confirmGet } from "../app/api/sponsors/confirm/route";
import { POST as webhookPost } from "../app/api/webhooks/dodo/route";

/**
 * End-to-end sponsor payment logic without a real card charge.
 * Live checkout always moves money; use Dodo test_mode + test cards for browser QA.
 */
describe("sponsor payment flow (no real charge)", () => {
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
      bidCents: 100,
      destinationUrl: "https://staylokal.app/",
      status: "pending",
      targetRank: 5,
    });
    retrieveMock.mockResolvedValue({
      amount: 100,
      metadata: { claim_id: claimId, target_rank: "5" },
      status: "succeeded",
      total_amount: 100,
    });
  });

  it("walks claim validation → checkout return URL → webhook → confirm poll", async () => {
    expect(minimumBidForRank([], 5)).toBe(100);

    const claim = validateSponsorClaim({
      bidCents: 100,
      category: "Developer Tools",
      companyName: "StayLokal QA",
      description: "Automated flow check",
      destination: "https://staylokal.app",
    });
    expect(claim?.bidCents).toBe(100);

    const returnUrl = buildSponsorCheckoutReturnUrl("https://staylokal.app", claimId);
    expect(returnUrl).toContain("sponsor=success");
    expect(returnUrl).toContain(`claim_id=${claimId}`);

    const newcomer: SponsorRecord = {
      bidCents: 100,
      category: "Developer Tools",
      companyName: "StayLokal QA",
      description: "Automated flow check",
      destinationUrl: "https://staylokal.app/",
      id: "qa-sponsor",
      paidAt: new Date().toISOString(),
      status: "active",
    };
    expect(activationOutcome([], newcomer).newSponsorStatus).toBe("active");

    unwrapMock.mockReturnValue({
      type: "payment.succeeded",
      data: { metadata: { claim_id: claimId }, payment_id: "pay_12345678" },
    });
    const webhookResponse = await webhookPost(new Request("https://staylokal.app/api/webhooks/dodo", {
      body: "{}",
      method: "POST",
      headers: { "webhook-id": "wh_test", "webhook-signature": "sig", "webhook-timestamp": String(Date.now()) },
    }));
    expect(webhookResponse.status).toBe(200);
    expect(activateClaimMock).toHaveBeenCalledWith(claimId, "pay_12345678");

    const confirmResponse = await confirmGet(new Request(
      `https://staylokal.app/api/sponsors/confirm?payment_id=pay_12345678&claim_id=${claimId}`,
    ));
    expect(confirmResponse.status).toBe(200);
    expect(await confirmResponse.json()).toEqual({ activated: true });
  });
});
