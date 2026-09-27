export type SponsorEmailDetails = {
  email: string;
  companyName?: string;
  rank?: string;
  bid?: string;
  paymentId: string;
};

export type SponsorEmailRenderOptions = {
  logoUrl: string;
  linkOrigin: string;
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Raised clay surface (email-safe inline). */
const clayRaised = "border-radius:20px;background:linear-gradient(165deg,#2a2a2a 0%,#1c1c1c 48%,#141414 100%);border:1px solid #3a3a3a;box-shadow:0 14px 28px rgba(0,0,0,0.55),0 2px 0 rgba(255,255,255,0.06) inset,0 -3px 10px rgba(0,0,0,0.45) inset;";

/** Inset clay well. */
const clayInset = "border-radius:18px;background:linear-gradient(180deg,#121212 0%,#1a1a1a 100%);border:1px solid #2e2e2e;box-shadow:0 3px 8px rgba(0,0,0,0.35) inset,0 1px 0 rgba(255,255,255,0.05) inset;";

/** Small stat tile. */
const clayTile = "border-radius:16px;background:linear-gradient(165deg,#262626 0%,#1a1a1a 55%,#121212 100%);border:1px solid #383838;box-shadow:0 10px 22px rgba(0,0,0,0.4),0 1px 0 rgba(255,255,255,0.07) inset,0 -2px 8px rgba(0,0,0,0.35) inset;";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function assetUrl(path: string, origin?: string) {
  const base = (origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** @deprecated Use resolveSponsorEmailLogoUrl() when sending mail. */
export function sponsorEmailLogoUrl() {
  return assetUrl("/images/logo.png");
}

export function buildSponsorEmailText(
  details: SponsorEmailDetails,
  failed = false,
  options?: Pick<SponsorEmailRenderOptions, "linkOrigin">,
) {
  const linkBase = options?.linkOrigin
    ?? (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  if (failed) {
    return [
      "We couldn't complete your StayLokal sponsor payment.",
      "",
      "Please return to checkout and try again. Your sponsor placement is not active yet.",
      "",
      `Payment ID: ${details.paymentId}`,
      "",
      assetUrl("/?sponsor=retry", linkBase),
    ].join("\n");
  }

  const company = details.companyName ?? "Your company";
  const rank = details.rank ? `#${details.rank}` : "your selected rank";
  const bid = details.bid ?? "your bid";
  return [
    "Your StayLokal sponsor placement is now live.",
    "",
    `${company} has secured ${rank} on the sponsor leaderboard with a ${bid} bid.`,
    "",
    `Payment ID: ${details.paymentId}`,
    "",
    assetUrl("/", linkBase),
  ].join("\n");
}

export function buildSponsorEmailHtml(
  details: SponsorEmailDetails,
  failed = false,
  options?: SponsorEmailRenderOptions,
) {
  const linkOrigin = options?.linkOrigin ?? (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const logo = options?.logoUrl ?? sponsorEmailLogoUrl();

  const companyName = details.companyName ? escapeHtml(details.companyName) : "Your company";
  const rankLabel = details.rank ? `#${escapeHtml(details.rank)}` : "—";
  const bidLabel = details.bid ? escapeHtml(details.bid) : "—";
  const title = failed ? "Payment needs attention" : "Your placement is live";
  const statusLabel = failed ? "Action required" : "Confirmed";
  const intro = failed
    ? "We couldn't complete your sponsor payment. Try checkout again — your listing stays inactive until payment succeeds."
    : "Your sponsor card is now on the StayLokal leaderboard.";
  const summary = failed
    ? "No charge completed for this attempt."
    : `${companyName} is live on the board.`;
  const action = failed ? "Return to checkout" : "Open StayLokal";
  const actionUrl = failed ? assetUrl("/?sponsor=retry", linkOrigin) : assetUrl("/", linkOrigin);
  const rulesUrl = assetUrl("/rules", linkOrigin);

  const metricsRow = failed
    ? ""
    : `<tr>
      <td style="padding:22px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding-right:7px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${clayTile}">
                <tr>
                  <td style="padding:18px 16px;font-family:${FONT};">
                    <div style="color:#9a9a9a;font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Rank</div>
                    <div style="color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.04em;margin-top:8px;line-height:1;">${rankLabel}</div>
                  </td>
                </tr>
              </table>
            </td>
            <td width="50%" style="padding-left:7px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${clayTile}">
                <tr>
                  <td style="padding:18px 16px;font-family:${FONT};">
                    <div style="color:#9a9a9a;font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Bid</div>
                    <div style="color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.04em;margin-top:8px;line-height:1;">${bidLabel}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;background-image:radial-gradient(ellipse 100% 70% at 50% 0%,#1f1f1f 0%,#000000 58%);">
    <tr>
      <td align="center" style="padding:44px 16px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">
          <tr>
            <td style="${clayRaised}overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:32px 28px 28px;background:linear-gradient(180deg,#222222 0%,#161616 100%);border-bottom:1px solid #333333;">
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="border-radius:22px;background:linear-gradient(145deg,#f0f0f0 0%,#d4d4d4 35%,#e8e8e8 100%);border:1px solid #ffffff;box-shadow:0 12px 24px rgba(0,0,0,0.45),0 2px 0 rgba(255,255,255,0.9) inset,0 -4px 12px rgba(0,0,0,0.12) inset;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <img src="${logo}" width="48" height="44" alt="StayLokal" style="display:block;border:0;outline:none;width:48px;height:44px;">
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top:16px;color:#ffffff;font-family:${FONT};font-size:16px;font-weight:800;letter-spacing:0.04em;">StayLokal</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px 28px 34px;font-family:${FONT};background:linear-gradient(180deg,#181818 0%,#101010 100%);">
                    <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:linear-gradient(180deg,#2e2e2e 0%,#1a1a1a 100%);border:1px solid #454545;color:#f5f5f5;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;box-shadow:0 4px 10px rgba(0,0,0,0.35),0 1px 0 rgba(255,255,255,0.08) inset;">${statusLabel}</span>
                    <h1 style="margin:22px 0 0;color:#ffffff;font-size:30px;line-height:1.12;letter-spacing:-0.035em;font-weight:800;">${title}</h1>
                    <p style="margin:14px 0 0;color:#b3b3b3;font-size:16px;line-height:1.65;font-weight:400;">${intro}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;${clayInset}">
                      <tr>
                        <td style="padding:18px 20px;color:#ededed;font-size:15px;line-height:1.55;font-weight:500;">
                          ${summary}
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${metricsRow}
                      <tr>
                        <td style="padding:20px 0 0;color:#8c8c8c;font-size:12px;line-height:1.5;">
                          Payment ID
                          <span style="color:#d4d4d4;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;">${escapeHtml(details.paymentId)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:26px 0 0;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:16px;background:linear-gradient(180deg,#ffffff 0%,#e8e8e8 100%);border:1px solid #ffffff;box-shadow:0 14px 28px rgba(0,0,0,0.4),0 2px 0 rgba(255,255,255,1) inset,0 -3px 10px rgba(0,0,0,0.08) inset;">
                            <tr>
                              <td align="center" style="padding:16px 24px;">
                                <a href="${actionUrl}" style="display:inline-block;font-family:${FONT};font-size:15px;font-weight:800;color:#000000 !important;text-decoration:none;letter-spacing:0.02em;">${action}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 8px 0;font-family:${FONT};color:#737373;font-size:12px;line-height:1.6;text-align:center;">
              <a href="${rulesUrl}" style="color:#e5e5e5;text-decoration:underline;font-weight:600;">Sponsor rules</a>
              <span style="color:#4a4a4a;"> · </span>
              <span style="color:#8c8c8c;">Sent after sponsor checkout on StayLokal</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
