type SponsorEmailDetails = {
  email: string;
  companyName?: string;
  rank?: string;
  bid?: string;
  paymentId: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !validEmail(payload.to)) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": payload.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      reply_to: process.env.RESEND_REPLY_TO || undefined,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend email failed with status ${response.status}.`);
  }
}

function assetUrl(path: string) {
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${origin}${path}`;
}

export function buildSponsorEmailHtml(details: SponsorEmailDetails, failed = false) {
  const companyName = details.companyName ? escapeHtml(details.companyName) : "your company";
  const rank = details.rank ? `#${escapeHtml(details.rank)}` : "your selected";
  const bid = details.bid ? escapeHtml(details.bid) : "your";
  const title = failed ? "Payment needs attention" : "Your placement is live";
  const statusLabel = failed ? "Action required" : "Payment confirmed";
  const intro = failed
    ? "We couldn't complete your StayLokal sponsor payment."
    : "Your StayLokal sponsor placement is now live.";
  const detail = failed
    ? "Please return to checkout and try again. Your sponsor placement is not active yet."
    : `<strong>${companyName}</strong> has secured <strong>${rank}</strong> on the sponsor leaderboard with a ${bid} bid.`;
  const action = failed ? "Return to checkout" : "Open StayLokal";
  const actionUrl = failed
    ? `${assetUrl("/?sponsor=retry")}`
    : assetUrl("/");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>${title}</title>
  <style>
    body { margin:0; background:#071312; color:#f6f4ee; font-family:Arial,sans-serif; }
    .email-page { background:#071312 url('${assetUrl("/chatbg.png")}') center top / cover no-repeat; padding:32px 16px; }
    .email-card { width:100%; max-width:560px; margin:0 auto; background:rgba(8,15,14,.94); border:1px solid rgba(220,240,232,.25); border-radius:18px; overflow:hidden; box-shadow:0 20px 55px rgba(0,0,0,.28); }
    .email-hero { border-top:3px solid #8ed8c4; padding:26px 30px 22px; background:linear-gradient(180deg,rgba(6,17,15,.18),rgba(6,17,15,.96)),url('${assetUrl("/chatbg.png")}') center / cover; }
    .email-logo { width:34px; height:34px; border-radius:10px; vertical-align:middle; margin-right:8px; }
    .email-brand { color:#fff; font-size:15px; font-weight:700; vertical-align:middle; }
    .email-body { padding:30px; }
    .email-status { display:inline-block; margin-bottom:18px; padding:6px 10px; border:1px solid rgba(142,216,196,.35); border-radius:999px; color:#a9e2d1; font-size:11px; font-weight:700; }
    .email-eyebrow { color:#9dd2c3; font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; }
    h1 { margin:12px 0 10px; color:#fff; font-size:32px; line-height:1.08; letter-spacing:-1px; }
    p { color:#bdc8c2; font-size:15px; line-height:1.6; }
    .email-detail { margin:22px 0; padding:16px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); border-radius:13px; color:#e9efeb; font-size:14px; line-height:1.6; }
    .email-button { display:inline-block; padding:12px 18px; border-radius:999px; background:#f6f4ee; color:#10201c !important; font-size:14px; font-weight:700; text-decoration:none; }
    .email-meta { color:#82918a; font-size:12px; }
    .email-footer { padding:0 30px 28px; color:#74827c; font-size:12px; }
    @media (prefers-color-scheme: light) {
      body { background:#f4f1eb; color:#17201d; }
      .email-page { background-color:#f4f1eb; background-image:url('${assetUrl("/images/bglightland.png")}'); }
      .email-card { background:rgba(255,253,249,.94); border-color:rgba(18,38,32,.16); }
      .email-hero { border-top-color:#376f62; background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,253,249,.94)),url('${assetUrl("/images/bglightland.png")}') center / cover; }
      .email-brand, h1 { color:#17201d; }
      p { color:#59655f; }
      .email-detail { background:rgba(20,60,48,.06); border-color:rgba(20,60,48,.14); color:#26352f; }
      .email-status { border-color:rgba(55,111,98,.25); color:#376f62; }
      .email-button { background:#17201d; color:#fff !important; }
      .email-footer, .email-meta { color:#708078; }
    }
  </style>
</head>
<body>
  <div class="email-page">
    <div class="email-card">
      <div class="email-hero">
        <img class="email-logo" src="${assetUrl("/images/logo.png")}" alt="StayLokal">
        <span class="email-brand">StayLokal</span>
      </div>
      <div class="email-body">
        <div class="email-status">${statusLabel}</div>
        <div class="email-eyebrow">Sponsor leaderboard</div>
        <h1>${title}</h1>
        <p>${intro}</p>
        <div class="email-detail">${detail}<br><span class="email-meta">Payment ID: ${escapeHtml(details.paymentId)}</span></div>
        <a class="email-button" href="${actionUrl}">${action}</a>
      </div>
      <div class="email-footer">Local-first file tools. Private by design.</div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendSponsorActivatedEmail(details: SponsorEmailDetails) {
  await sendEmail({
    to: details.email,
    subject: "Your StayLokal sponsor placement is live",
    idempotencyKey: `sponsor-activated-${details.paymentId}`,
    html: buildSponsorEmailHtml(details),
    text: `Your StayLokal sponsor placement is now live.\n\n${details.companyName ?? "Your company"} has secured ${details.rank ? `#${details.rank}` : "your selected"} on the sponsor leaderboard with a ${details.bid ?? "your"} bid.\n\nPayment ID: ${details.paymentId}`,
  });
}

export async function sendSponsorPaymentFailedEmail(details: SponsorEmailDetails) {
  await sendEmail({
    to: details.email,
    subject: "Your StayLokal sponsor payment needs attention",
    idempotencyKey: `sponsor-failed-${details.paymentId}`,
    html: buildSponsorEmailHtml(details, true),
    text: `We couldn't complete your StayLokal sponsor payment.\n\nPlease return to checkout and try again. Your sponsor placement is not active yet.\n\nPayment ID: ${details.paymentId}`,
  });
}
