# Sponsor leaderboard setup

The sponsor board is intentionally account-free. A sponsor submits a listing, pays
through Dodo Payments, and becomes visible only after the signed payment webhook is
processed.

## Appwrite

Create a TablesDB database and these tables:

The shared VelocityBrain project can use the following isolated StayLokal
resources:

- Database: `6aa918ed001e3dd5a377`
- Sponsors table: `ihatefiles_sponsors`
- Claims table: `ihatefiles_claims`
- Sponsor logo bucket: `ihatefiles_sponsor_logos`

- `sponsors` table: `companyName`, `destinationUrl`, `handle`, `category`, `description`,
  `logoUrl`, `bidCents` (integer), `paidAt` (datetime string), `paymentId`,
  `claimId`, and `status`.
- `sponsor_claims` table: `companyName`, `destinationUrl`, `handle`, `category`,
  `description`, `logoUrl`, `bidCents`, `targetRank`, `status`, `paymentId`, and
  `sponsorId`.

Create a storage bucket for sponsor logos. Limit files to PNG, JPEG, and WebP and
512 KB or less. The server API key needs read/write access to the database,
tables, and bucket.

Set the matching values from `.env.example` in `.env.local`. Appwrite values are
server-only and must not use a `NEXT_PUBLIC_` prefix.

Also set `NEXT_PUBLIC_APP_URL` to your public site origin so checkout returns resolve
correctly (`https://staylokal.app` in production today). For sponsor **email images in Gmail**, set a public HTTPS origin via
`NEXT_PUBLIC_APP_URL` or `SPONSOR_EMAIL_ASSET_BASE_URL`. When neither is public,
StayLokal uploads `public/images/logo.png` to your Appwrite sponsor logo bucket as
`staylokal_email_logo` (world-readable) so clients can load the mark.

**Inbox sender avatar** (circle next to “Hardik @ StayLokal” in Gmail) is **not**
controlled by HTML. It comes from the SMTP sender’s Google account photo or
[Gravatar](https://gravatar.com) for the **From** address. To show the StayLokal
icon there, set that profile image to your logo, or plan BIMI for a verified brand
logo on a custom domain.

## Sponsor email (Appwrite Messaging)

Sponsor activation and payment-failure emails are sent through **Appwrite
Messaging**, not a separate Resend integration in this app.

1. In Appwrite Console, open **Messaging** → **Providers** → **Add provider** →
   **Email** (SMTP, Resend-as-provider, Mailgun, SendGrid, or SES).
2. Enable the provider and verify sender `from` address/domain.
3. Ensure the server API key can create messaging users/targets/messages
   (`users.write`, `targets.write`, `messages.write`).
4. Optional: set `APPWRITE_MESSAGING_EMAIL_PROVIDER_ID` to your enabled email provider
   ID from **Messaging → Providers** (StayLokal auto-picks the only enabled email
   provider when this is omitted).
5. Gmail SMTP: use an [App Password](https://support.google.com/accounts/answer/185833)
   (not your main password), host `smtp.gmail.com`, port `587`, encryption `TLS`,
   and a matching **From** address.

During local development:

- Run `npm run dev` (webpack). Turbopack-only `next dev` can return HTML 404s for `/api/*` routes in this repo.
- Preview HTML at `/email-preview`.
- Send a live SMTP test (dev only):

```bash
curl -X POST http://localhost:3000/api/dev/test-sponsor-email \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"you@example.com\"}"
```

## Dodo Payments

Create one one-time product with Pay What You Want enabled. Set the product
minimum to `$1.00` and use its product ID as `DODO_SPONSOR_PRODUCT_ID`.

Configure a webhook pointing to:

```text
https://staylokal.app/api/webhooks/dodo
```

Subscribe to successful payment events and copy the webhook signing key into
`DODO_PAYMENTS_WEBHOOK_KEY`. The webhook is the only event that activates a
sponsor; returning from checkout does not activate a listing.

## Ranking behavior

The application stores bids as integer cents. Five active listings are sorted by:

1. Highest bid.
2. Earlier successful payment.
3. Stable sponsor ID.

To claim rank `N`, the bid must be at least one cent above the current bid at
rank `N`. A successful payment is inserted into the active set, the five ranks
are recalculated, and any sixth listing is marked `outbid`.
