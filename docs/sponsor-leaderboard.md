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

## Dodo Payments

Create one one-time product with Pay What You Want enabled. Set the product
minimum to `$1.00` and use its product ID as `DODO_SPONSOR_PRODUCT_ID`.

Configure a webhook pointing to:

```text
https://your-domain.com/api/webhooks/dodo
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
