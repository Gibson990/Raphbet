# Raphbet — Launch Readiness

Status as of 2026-06-10. This is the single source of truth for "are we ready to
go live, and what's left." Read top to bottom before any production deploy.

## TL;DR

The platform is **functionally complete** — deposits, bet placement (singles +
accumulators), withdrawals, settlement, KYC, auth and a full admin console all
work end-to-end. This pass closed the most serious **money-integrity hole**
(clients could forge their own odds) and brought the accumulator boost in line
with industry norms. What stands between you and a real-money launch is now
mostly **external/legal**: paid API subscriptions, a gambling licence, and the
production hardening checklist below — **not** missing features.

Do **not** take real-money deposits until the "Must-do before real money"
section is fully checked.

---

## What was fixed in this pass

| Area | Before | After |
|------|--------|-------|
| **Odds integrity** | Bet requests carried a client-supplied `odds` field; settlement paid `wager × odds`. A crafted request could set `odds: 1000` and drain the house on a win. | The server **reprices every selection** from its own odds engine at placement (`OddsForSelection`). Forged odds are ignored; unknown/finished selections are rejected. Covered by tests. |
| **Accumulator boost** | Ladder ran to **+500%** at 45 legs — catastrophic; far beyond any real book. | Re-aligned to the **bet365 ladder** (2.5% at 2 legs → **100% cap at 20 legs**). Hard cap of **20 legs** per acca. |
| **Duplicate legs** | Same match could appear twice in one acca (correlated, exploitable). | Server rejects duplicate match IDs in an accumulator. |
| **Admin risk view** | No real-time exposure metric. | New **Open Risk Exposure** KPI = max payout owed across all pending bets (turns red if it exceeds wallet liability). |
| **Bet history** | "My Bets" rendered only single bets; accumulators showed one leg with the wrong payout. | Renders accumulators correctly: all legs, combined odds, boost badge, true "to win". |

All backend tests pass (`go test ./...`), `go vet` is clean, and the frontend
type-checks and builds.

---

## Core user flows — verified present

- **Deposit / top-up** — crypto via NOWPayments (sandbox until keys set), wallet credited on capture/IPN.
- **Place bet** — singles and accumulators; server-authoritative wallet, KYC-gated, stake limits enforced, odds repriced server-side.
- **Withdraw** — KYC-gated, funds held on request, admin approval queue, refund on reject.
- **Settlement** — background worker grades pending bets against real match results (1X2, O/U, BTTS, DC, HT, correct score, first-half).
- **Admin** — overview KPIs + revenue chart, player management (adjust balance, suspend, KYC), bets board with manual settle, withdrawals queue, live risk config (margin/limits) with DB persistence, PDF exports.

---

## Odds competitiveness

- **House margin (overround):** default **7%** (`HOUSE_MARGIN`), runtime-tunable from the admin Settings tab. bet365/Pinnacle sit ~2–5% on headline football markets; 1xBet/local books ~5–8%. **Recommendation: set margin to 0.05 (5%)** to be visibly competitive while staying profitable. Lower margin = better-looking odds = more volume.
- **Accumulator boost:** now matches bet365 (up to +100% at 20 legs), applied on top of already margin-loaded legs — competitive without being loss-making.

---

## Hosting: Vercel + Railway — yes, with one rule

| Component | Host | Notes |
|-----------|------|-------|
| **Frontend** (Vite SPA, static) | **Vercel** ✅ | Build `npm run build`, output `dist/`. Set `VITE_API_BASE_URL` to the Railway API URL at build time. Perfect fit. |
| **Backend** (Go API + settlement worker) | **Railway** ✅ | Builds `backend/Dockerfile`. **Do NOT host the Go backend on Vercel** — Vercel is serverless and kills the long-running settlement ticker. |
| **Database** | **MongoDB Atlas** (free M0 to start) | Set `MONGO_URI`, `MONGO_DB`. Enable automated backups. |

**The one rule:** run **exactly one** backend instance with the settlement
worker. If you scale Railway to 2+ replicas, bets get **double-settled** (paid
twice). Either keep it at 1 replica, or split the worker into its own single
service before scaling the API horizontally. This is the #1 scaling gotcha.

Deploy order: Atlas → Railway (API, with env vars) → Vercel (web, pointing at the API URL) → set `ALLOWED_ORIGINS` on the API to the Vercel domain.

---

## API subscriptions you need to buy

You must create these accounts yourself (they need your identity/billing/2FA — I
can't subscribe for you). Wire the keys into the backend env (Railway secrets).

| Service | Why | Plan to buy | Env vars |
|---------|-----|-------------|----------|
| **api-football** (api-sports.io) | Real World Cup fixtures, live scores, results. Free tier = 100 req/day and **cannot access the 2026 season** (paid-plan restriction). Without it the app runs on the bundled mock slate. | **Pro (~$29/mo)** or higher for 2026 + live data | `API_SPORTS_KEY`, `SEASON=2026` |
| **NOWPayments** | Crypto deposits **and** automated withdrawals/payouts. | Free to create; enable **payouts** (needs 2FA + IP whitelist + funded balance) | `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_CALLBACK_URL` |
| **Didit** | KYC / identity verification (legally required for withdrawals). Sandbox auto-approves until keys are set. | Free tier exists; verify volume limits | `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET` |
| **Firebase Auth** | Google + phone-OTP login, server-verified. Admin role by email allow-list. | Free (Spark) is fine to start | `FIREBASE_PROJECT_ID`, `ADMIN_EMAILS` |
| **MongoDB Atlas** | Persistence + backups. | Free M0 → paid as you grow | `MONGO_URI`, `MONGO_DB` |

Until each key is set the app uses a safe sandbox/mock, so you can launch staged
(e.g. real auth + KYC first, real crypto rails second).

---

## Must-do before real money (blockers)

- [ ] **Gambling licence** for your jurisdiction. This is a legal prerequisite, not optional. Everything else can be ready and you still cannot legally take real-money bets without it.
- [ ] **Change `ADMIN_KEY`** from the default `raphbet-admin`, and set `ADMIN_EMAILS` so admin is gated by Firebase role, not the shared key.
- [ ] **`INITIAL_BALANCE=0`** in production (no free credits). *(Already the default.)*
- [ ] **HTTPS/TLS** in front of the API (Railway gives you this; ensure the web origin is HTTPS too).
- [ ] **Set `ALLOWED_ORIGINS`** to your real Vercel domain(s) only.
- [ ] **Buy the API subscriptions** above and wire the secrets via the host's secrets manager (never commit `.env`).
- [ ] **NOWPayments payouts** fully configured (2FA, IP whitelist, balance) before enabling automated withdrawals — today approved withdrawals are marked paid in sandbox.
- [ ] **Single settlement instance** confirmed (see hosting rule above).
- [ ] **Set house margin to 0.05** (or your chosen competitive number).

## Should-do soon (hardening, not blockers)

- [ ] **Error tracking + uptime** (Sentry + an uptime monitor with alerts).
- [ ] **Redis** for the rate limiter + cache once you run more than one API instance (current limiter is in-memory/per-instance).
- [ ] **Responsible-gambling tools** (deposit limits, self-exclusion, time-outs) — partly legally required depending on jurisdiction.
- [ ] **DB backups verified** (Atlas automated backups + a test restore).
- [ ] **Per-user max exposure / liability cap** to bound how much a single player can win on one market.

---

## Security posture (current)

Good: server-authoritative wallet, per-device mutation locks (no overdraw race),
KYC-gated bets and withdrawals, admin endpoints behind auth, request body cap,
per-IP rate limiting, CORS allow-list, structured request logs, money stored as
integer cents, **and now server-side odds repricing**. The architecture is clean
(hexagonal) so swapping infra (Redis, a second settlement service) is low-risk.

The remaining gaps are operational/legal (above), not structural.
