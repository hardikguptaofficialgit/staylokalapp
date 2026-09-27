# StayLokal

Local-first browser utilities for PDF, image, video, audio, documents, and archives. Files are processed on your device; optional donation and sponsor flows use server APIs only for payments and persistence—not for your uploads.

**Live product:** drop files → pick a compatible tool → process in the browser → download results.

## Features

- **75 exposed tools** across image, PDF, video, audio, presentation, document, spreadsheet, and archive workflows (see `lib/tools/registry.ts` and `docs/functionality-audit.md`).
- **Visual editors** for image crop, PDF pages, and media trim timelines where the tool needs them.
- **512 MB** combined input limit with clear errors before processing starts.
- **Sponsor leaderboard** — five ranked placements, Dodo Payments checkout, Appwrite persistence, payment return confirmation, and signed webhooks.
- **Donations** — optional hosted checkout via Dodo (`/donate`).
- **Dark / light theme** on the main app shell.

Heavy work runs in the browser (Canvas, PDF.js, pdf-lib, FFmpeg WASM workers, Tesseract, ONNX segmentation, ESRGAN upscaling, etc.). Self-hosted assets live under `public/`.

## Requirements

- Node.js 20+ (LTS recommended)
- npm

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Important:** `npm run dev` runs Next.js with **webpack** (`scripts/next-dev.mjs`). Plain `next dev` (Turbopack) can return HTML 404s for `/api/*` routes in this repo—always use the npm script.

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Development server (webpack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm test` | Vitest unit/integration tests (acceptance gate for V1) |
| `npm run test:browser` | Playwright browser suites (optional; can be slow or environment-limited) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run preview` / `deploy` / `upload` | OpenNext on Cloudflare (see `wrangler` config) |

## Verification

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Configuration

Copy environment variables into `.env.local` (never commit secrets).

### Core (optional)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Public site origin for checkout returns and email links |

### Dodo Payments (donations + sponsors)

| Variable | Purpose |
|----------|---------|
| `DODO_PAYMENTS_API_KEY` | API key |
| `DODO_PAYMENTS_ENVIRONMENT` | `test_mode` or `live_mode` (must match where payments were created) |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Webhook signing secret |
| `DODO_DONATION_PRODUCT_ID` | Donation product |
| `DODO_SPONSOR_PRODUCT_ID` | Sponsor PWYW product (min $1) |
| `DODO_SPONSOR_RETURN_URL` | Optional override for post-checkout return (claim id is appended automatically) |
| `DODO_PAYMENTS_RETURN_URL` | Donation return URL override |

Webhook URL: `https://your-domain.com/api/webhooks/dodo`

### Appwrite (sponsor leaderboard + emails)

| Variable | Purpose |
|----------|---------|
| `APPWRITE_ENDPOINT` | API endpoint |
| `APPWRITE_PROJECT_ID` | Project ID |
| `APPWRITE_API_KEY` | Server API key |
| `APPWRITE_DATABASE_ID` | TablesDB database |
| `APPWRITE_SPONSORS_TABLE_ID` | Active sponsors table |
| `APPWRITE_CLAIMS_TABLE_ID` | Pending/paid claims table |
| `APPWRITE_SPONSOR_BUCKET_ID` | Sponsor logo storage |
| `APPWRITE_MESSAGING_EMAIL_PROVIDER_ID` | Optional; email provider for sponsor notifications |

Optional email branding: `SPONSOR_EMAIL_ASSET_BASE_URL`, `SPONSOR_EMAIL_LOGO_URL`.

Full sponsor setup (schema, ranking, Dodo, messaging): **[docs/sponsor-leaderboard.md](docs/sponsor-leaderboard.md)**.

Sponsor rules (user-facing): **[app/rules/page.tsx](app/rules/page.tsx)** → `/rules`.

## Project layout

```text
app/                 Next.js App Router (page, API routes, styles)
components/app/      Landing, tool browser, sponsor UI, workspace
components/editor/   Image, PDF, video, and audio editors
lib/tools/           Registry, processors (image, pdf, ffmpeg, document)
lib/sponsors/        Ranking, Appwrite, Dodo payment verification
lib/app/             Client workflow state (useFileWorkflow)
public/              FFmpeg, Tesseract, models, brand assets
tests/               Vitest + Playwright
docs/                Operational guides
```

Canonical engineering status and behavior notes: **[AGENTS.md](AGENTS.md)**.

## API routes (server)

| Route | Role |
|-------|------|
| `GET /api/sponsors/leaderboard` | Ranked active sponsors |
| `POST /api/sponsors/claim` | Create claim + Dodo checkout |
| `GET /api/sponsors/confirm` | Verify payment and activate (return URL polling) |
| `POST /api/webhooks/dodo` | Signed payment events (activation + email) |
| `POST /api/donations/checkout` | Donation checkout session |
| `POST /api/dev/test-sponsor-email` | Dev-only SMTP test (404 in production) |

## Sponsor payment flow (summary)

1. User submits listing → pending claim in Appwrite → redirect to Dodo checkout.
2. Return URL includes `sponsor=success`, `claim_id`, and `payment_id`.
3. Client polls `confirm`; server verifies amount (pre-tax bid), metadata, and activates.
4. Webhook provides the durable activation path and sponsor emails when configured.

Bid amounts are stored and displayed in **integer cents** (leaderboard shows dollars with cents when needed).

## License

Private project (`package.json` → `"private": true`). All rights reserved unless otherwise stated by the repository owner.
