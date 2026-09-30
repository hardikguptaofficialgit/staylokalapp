import { config } from "dotenv";
import { describe, expect, it } from "vitest";

config({ path: ".env.local" });

const claimId = process.env.DODO_TEST_CLAIM_ID;
const paymentId = process.env.DODO_TEST_PAYMENT_ID;

describe.runIf(Boolean(claimId && paymentId))("dodo test_mode sponsor activation (manual)", () => {
  it("activates a pending claim after a succeeded test payment", async () => {
    const { activateClaim, listActiveSponsors } = await import("../lib/sponsors/appwrite");
    await activateClaim(claimId!, paymentId!);
    const sponsors = await listActiveSponsors();
    const match = sponsors.find((sponsor) => sponsor.companyName === "Test Mode Sponsor");
    expect(match).toBeTruthy();
    expect(match?.bidCents).toBe(100);
  }, 60_000);
});
