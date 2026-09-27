import { sendAppwriteHtmlEmail } from "./appwrite-messaging";
import { resolveEmailLinkOrigin, resolveSponsorEmailLogoUrl } from "./email-brand-logo";
import {
  buildSponsorEmailHtml,
  buildSponsorEmailText,
  type SponsorEmailDetails,
} from "./sponsor-email-template";

async function sponsorEmailRenderOptions() {
  const [logoUrl, linkOrigin] = await Promise.all([
    resolveSponsorEmailLogoUrl(),
    Promise.resolve(resolveEmailLinkOrigin()),
  ]);
  return { logoUrl, linkOrigin };
}

export type { SponsorEmailDetails };
export { buildSponsorEmailHtml, buildSponsorEmailText, assetUrl } from "./sponsor-email-template";

export async function sendSponsorActivatedEmail(details: SponsorEmailDetails) {
  const render = await sponsorEmailRenderOptions();
  await sendAppwriteHtmlEmail({
    to: details.email,
    subject: "Your StayLokal sponsor placement is live",
    idempotencyKey: `sponsor-activated-${details.paymentId}`,
    html: buildSponsorEmailHtml(details, false, render),
    text: buildSponsorEmailText(details, false, render),
  });
}

export async function sendSponsorPaymentFailedEmail(details: SponsorEmailDetails) {
  const render = await sponsorEmailRenderOptions();
  await sendAppwriteHtmlEmail({
    to: details.email,
    subject: "Your StayLokal sponsor payment needs attention",
    idempotencyKey: `sponsor-failed-${details.paymentId}`,
    html: buildSponsorEmailHtml(details, true, render),
    text: buildSponsorEmailText(details, true, render),
  });
}
