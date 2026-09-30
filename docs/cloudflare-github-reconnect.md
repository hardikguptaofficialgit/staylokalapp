# Fix: “Error fetching GitHub User or Organization details”

Cloudflare Workers Builds lost permission to read your GitHub account. **Push-to-deploy only works after GitHub + Cloudflare are re-linked.** (No GitHub Actions required.)

## Part A — GitHub (2 minutes)

1. Open **Installed GitHub Apps**:  
   https://github.com/settings/installations

2. Click **Configure** on **Cloudflare Workers and Pages**.

3. **Repository access**
   - Choose **All repositories**, **or**
   - **Only select repositories** → include **`staylokalapp`**.

4. Save. If the app is missing, install fresh:  
   https://github.com/apps/cloudflare-workers-and-pages/installations/new  
   → pick account **hardikguptaofficialgit** → select **staylokalapp** → **Install**.

## Part B — Cloudflare (2 minutes)

1. https://dash.cloudflare.com/?to=/:account/workers-and-pages → **staylokalapp**

2. **Settings** → **Builds** → **Disconnect** Git.

3. **Connect** again → GitHub → **hardikguptaofficialgit/staylokalapp** → branch **main**.

4. Confirm the red error is **gone**.

5. Set commands **exactly**:

   | Field | Value |
   |-------|--------|
   | Build command | `npx opennextjs-cloudflare build && node scripts/prepare-cloudflare-assets.mjs` |
   | Deploy command | `npx wrangler deploy` |
   | Root directory | `/` |

6. **Deployments** → cancel any **Queued** build → **Retry** latest on `main`.

## Part C — Verify

- New push to `main` starts a build within ~1 minute.
- Build log shows **Cloning repository…** (not stuck on Initializing only).

Worker secrets (Dodo, Appwrite) stay in Cloudflare; reconnecting Git does not delete them.
