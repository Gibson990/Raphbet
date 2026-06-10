# Deploy Runbook — Railway (API) + Vercel (Web) + Atlas (DB)

Copy-paste, in order. This is the CLI path; `docs/GO_LIVE.md` has the full
pre-launch checklist and `docs/DEPLOY.md` the high-level overview.

**Architecture:** MongoDB Atlas (data) ← Go API on Railway → React web on Vercel.

**Prerequisites**
- Logged in: `vercel login` and `railway login` (done in your terminal).
- Run commands from the repo root unless a step says otherwise.
- Railway CLI v4+, Vercel CLI installed (you have both).

---

## Step 1 — MongoDB Atlas (web UI, ~5 min)

1. Create a free **M0** cluster at <https://cloud.mongodb.com>.
2. **Database Access** → add a user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — Railway egress
   IPs aren't fixed on the cheap plans). Tighten later if you get static egress.
4. **Connect → Drivers** → copy the connection string. It looks like:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`
5. Keep it for `MONGO_URI` below.

---

## Step 2 — Deploy the API to Railway

The Dockerfile lives in `backend/`, so deploy from there. The app reads Railway's
injected `$PORT` automatically.

```bash
cd backend

# Create a new Railway project (pick a name when prompted)
railway init

# Set the API environment (one command; edit values first).
# NOTE: leave ALLOWED_ORIGINS for now — we set it in Step 4 once we have the web URL.
railway variables \
  --set "MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority" \
  --set "MONGO_DB=raphbet" \
  --set "INITIAL_BALANCE=0" \
  --set "ADMIN_KEY=CHANGE-ME-to-a-long-random-string" \
  --set "ADMIN_EMAILS=you@example.com" \
  --set "HOUSE_MARGIN=0.05" \
  --set "API_SPORTS_KEY=your-api-football-key" \
  --set "SEASON=2026" \
  --set "FIREBASE_PROJECT_ID=raphbet-334ce" \
  --set "NOWPAYMENTS_API_KEY=your-nowpayments-key" \
  --set "NOWPAYMENTS_IPN_SECRET=your-ipn-secret" \
  --set "DIDIT_API_KEY=your-didit-key" \
  --set "DIDIT_WORKFLOW_ID=your-workflow-id" \
  --set "DIDIT_WEBHOOK_SECRET=your-didit-webhook-secret"

# Build & deploy from the Dockerfile in this directory
railway up

# Give the service a public URL and copy it
railway domain
```

`railway domain` prints something like `https://raphbet-api-production.up.railway.app`.
**Copy that — it's your API URL.** Verify it:

```bash
curl https://<your-railway-api>/health      # -> {"status":"ok"}
```

> ⚠️ Keep this to **one instance** (default). A second replica double-settles
> bets. Don't scale the API replica count up without splitting out the
> settlement worker first.

---

## Step 3 — Deploy the Web to Vercel

The web app reads the API URL from `VITE_API_BASE_URL` **at build time**, so set
it before deploying. `frontend/vercel.json` already configures the Vite build +
SPA routing.

```bash
cd ../frontend

# Link/create the Vercel project (accept the prompts; root dir = current folder)
vercel link

# Point the web build at your Railway API (paste the URL from Step 2).
# Choose "Production" (and optionally Preview/Development) when prompted for env.
vercel env add VITE_API_BASE_URL production
# (paste: https://<your-railway-api>   — no trailing slash)

# Build & deploy to production
vercel --prod
```

`vercel --prod` prints your live web URL, e.g. `https://raphbet.vercel.app`.
**Copy it for Step 4.**

---

## Step 4 — Connect web ↔ API (CORS)

The API only accepts browser calls from origins in `ALLOWED_ORIGINS`. Set it to
your Vercel URL (and any custom domain), then redeploy the API.

```bash
cd ../backend
railway variables --set "ALLOWED_ORIGINS=https://raphbet.vercel.app"
railway up    # redeploy so the new origin takes effect
```

Open your Vercel URL in a browser — matches, odds and standings should load (that
confirms the web is talking to the API through CORS).

---

## Step 5 — Wire the provider webhooks

Using your Railway API URL:

- **NOWPayments (deposits):** dashboard → set the **IPN callback URL** to
  `https://<your-railway-api>/api/payments/nowpayments/webhook` and make sure the
  dashboard's IPN secret equals `NOWPAYMENTS_IPN_SECRET`.
- **Didit (KYC):** dashboard → set the webhook to
  `https://<your-railway-api>/api/kyc/webhook` and the secret to
  `DIDIT_WEBHOOK_SECRET`. (Polling also works without this, but the webhook is
  more reliable.)

---

## Step 6 — Smoke test the live deployment

```bash
# From the repo root. Simulates a confirmed crypto deposit crediting a wallet.
node scripts/test-deposit.mjs \
  --api https://<your-railway-api> \
  --device smoke-test --amount 5 \
  --secret "<your NOWPAYMENTS_IPN_SECRET>"

# Confirm it credited:
curl -H "X-Device-Id: smoke-test" https://<your-railway-api>/api/wallet
```

Then in the browser: open the Vercel site → sign in → (real KYC needs Didit
credits) → place a bet. For a real money-in test, send a small actual crypto
deposit via NOWPayments and confirm the wallet credits automatically.

---

## Day-2 reference

```bash
railway logs                       # tail API logs
railway variables                  # list env
railway variables --set "K=V"      # change a var, then `railway up` to apply
railway up                         # redeploy API after code changes
vercel --prod                      # redeploy web (rebuilds with current env)
vercel env ls                      # list web env vars
```

Custom domain: add it in the Vercel dashboard, then append it to
`ALLOWED_ORIGINS` on Railway and update the `raphbet.com` placeholders in
`frontend/index.html`, `robots.txt`, and `sitemap.xml`.
