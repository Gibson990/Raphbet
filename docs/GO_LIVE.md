# Raphbet — Go-Live Checklist

Tick these off in order. Three buckets: **Legal** (the long pole — start first),
**Money & accounts** (fund these), and **Deploy & config** (a day or two of work).

Payments run on **manual payouts** (Plan A): deposits auto-credit, bets and
settlement are automatic, and withdrawals are *player requests → funds held →
you send the crypto → click Approve*. Nothing more to build for payments.

> ⚠️ Do **not** take real-money deposits until everything in **Legal** and
> **Money & accounts** is done and the **Deploy & config** items are live.

---

## 🏛️ 1. Legal — start this first, it takes the longest

- [ ] **Gambling licence** for the jurisdiction you operate in. This is the one
      hard blocker — you cannot legally take real-money bets without it.
- [ ] Confirm online betting + crypto payments are permitted where your players are.
- [ ] Terms, Privacy and Responsible-Gaming pages reviewed by someone qualified
      (the in-app copy is updated for real-money crypto, but it is not legal advice).
- [ ] Responsible-gambling tooling appropriate to your licence (deposit limits,
      self-exclusion, time-outs) — some of this may be legally required.

## 💰 2. Money & accounts — fund these

- [ ] **Didit (KYC) credits** — top up at <https://business.didit.me>. KYC is
      blocked until you do (verification returns "not enough credits").
- [ ] **Your crypto payout float** — hold crypto in your NOWPayments balance (or
      a wallet you control) to pay winners when you approve withdrawals.
      **Rule: keep the float bigger than the admin "Open Risk Exposure" KPI.**
      A few thousand USD is a sensible start; scale with volume.
- [ ] **NOWPayments deposit account** — verified, with your receiving wallet
      address linked (✅ you've done the BTC address).
- [ ] *(Recommended)* **api-football Pro plan (~$29/mo)** at
      <https://www.api-football.com/> for real 2026 fixtures, live scores and
      results. Without it the app runs on the built-in demo slate.

## 🚀 3. Deploy & config

### Host the three services
- [ ] **Database** → MongoDB Atlas (free M0 to start). Enable automated backups.
- [ ] **API** → Railway (builds `backend/Dockerfile`). **Run exactly ONE
      instance** — the settlement worker double-pays bets if you run two.
- [ ] **Web** → Vercel (build `npm run build`, output `dist/`). Set
      `VITE_API_BASE_URL` to the Railway API URL at build time.
- [ ] Do **not** host the Go API on Vercel — its serverless model kills the
      settlement worker.

### Wire the deposit webhook (so deposits auto-credit)
- [ ] In the NOWPayments dashboard set the **IPN callback URL** to
      `https://<your-railway-api>/api/payments/nowpayments/webhook`.
- [ ] Copy the **IPN secret** into the API env (`NOWPAYMENTS_IPN_SECRET`).
- [ ] Until this is on a public URL, deposits will not auto-credit — this is the
      only payment piece that requires hosting.

### Security & config
- [ ] **Change `ADMIN_KEY`** from the default `raphbet-admin` to a long random value.
- [ ] Set `ADMIN_EMAILS` so admin is gated by your Firebase login, not just the key.
- [ ] `INITIAL_BALANCE=0` (no free credits) — already the default.
- [ ] Set `ALLOWED_ORIGINS` to your real web domain(s) only.
- [ ] Confirm HTTPS in front of the API (Railway provides it).
- [ ] Set a competitive `HOUSE_MARGIN` (default is `0.05` = 5%).
- [ ] Replace the `raphbet.com` placeholder with your real domain in
      `frontend/index.html`, `frontend/public/robots.txt`, and
      `frontend/public/sitemap.xml`.

### Monitoring (do soon after launch)
- [ ] Error tracking (Sentry) + an uptime monitor with alerts.
- [ ] Verify an Atlas backup restore actually works.

---

## Backend environment variables

Set these as **Railway secrets** (never commit `.env`).

| Var | Purpose | Example / note |
|-----|---------|----------------|
| `PORT` | API port | Railway sets this |
| `ALLOWED_ORIGINS` | CORS allow-list (CSV) | `https://app.yourdomain.com` |
| `MONGO_URI`, `MONGO_DB` | Atlas persistence | from Atlas |
| `INITIAL_BALANCE` | new-wallet seed (USD cents) | `0` in production |
| `ADMIN_KEY` | admin fallback key | long random string |
| `FIREBASE_PROJECT_ID`, `ADMIN_EMAILS` | auth + admin role | your project + your email |
| `HOUSE_MARGIN` | overround | `0.05` (5%) |
| `MIN_BET`, `MAX_BET`, `MIN_WITHDRAWAL`, `MAX_WITHDRAWAL` | risk limits (cents) | tune in admin |
| `API_SPORTS_KEY`, `SEASON` | live football data | Pro plan, `2026` |
| `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_CALLBACK_URL` | crypto deposits | callback = API URL + webhook path |
| `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET` | KYC | from Didit |
| `RATE_LIMIT_PER_MIN` | per-IP rate limit | `120` default |

## Frontend build variable
| Var | Purpose |
|-----|---------|
| `VITE_API_BASE_URL` | the public Railway API URL (set at build time on Vercel) |

---

## When can I flip the switch?

You're ready for real money when **all** of these are true:

1. ✅ Licence in hand.
2. ✅ Didit funded + your crypto float funded.
3. ✅ Hosted (Atlas + one Railway API + Vercel web), HTTPS on.
4. ✅ Deposit webhook live and a real $1 deposit auto-credited a test wallet.
5. ✅ `ADMIN_KEY` changed, `ALLOWED_ORIGINS` set, `INITIAL_BALANCE=0`.

Later, when withdrawal volume gets heavy, consider automated payouts
(NOWPayments Payout API) — but keep manual review on large amounts. Scaling
(Redis + multiple API instances behind a load balancer) only matters at tens of
thousands of concurrent users; until then, one instance is plenty.
