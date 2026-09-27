import { describe, expect, it } from "vitest";
import {
  messagingMessageId,
  messagingTargetIdForEmail,
  messagingUserIdForEmail,
} from "../lib/notifications/appwrite-messaging";
import { buildSponsorEmailHtml } from "../lib/notifications/sponsor-email-template";

describe("sponsor email template", () => {
  it("escapes unsafe html in company name", () => {
    const html = buildSponsorEmailHtml({
      email: "a@b.co",
      companyName: "<script>alert(1)</script>",
      paymentId: "pay_test12345678",
      rank: "1",
      bid: "$10.00",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes rank and bid stat blocks for success emails", () => {
    const html = buildSponsorEmailHtml({
      email: "a@b.co",
      companyName: "Acme",
      paymentId: "pay_test12345678",
      rank: "2",
      bid: "$25.00",
    }, false, {
      logoUrl: "https://example.com/images/logo.png",
      linkOrigin: "https://example.com",
    });
    expect(html).toContain("#2");
    expect(html).toContain("$25.00");
    expect(html).toContain("https://example.com/images/logo.png");
    expect(html).not.toContain("localhost");
  });
});

describe("appwrite messaging ids", () => {
  it("generates stable ids within appwrite limits", () => {
    const email = "sponsor@example.com";
    expect(messagingUserIdForEmail(email)).toHaveLength(36);
    expect(messagingTargetIdForEmail(email)).toHaveLength(36);
    expect(messagingMessageId("sponsor-activated-pay_x")).toHaveLength(36);
    expect(messagingUserIdForEmail(email)).toBe(messagingUserIdForEmail(email));
  });
});
