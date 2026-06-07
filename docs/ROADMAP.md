# Raphbet Roadmap & Requirements Backlog

Build order agreed with the owner: **C → B → the rest** (auth last). This file
is the running checklist so nothing is forgotten.

## Phase C — Live football data ✅ DONE
- [x] Monorepo split (`frontend/` + `backend/`), clean/hexagonal Go backend
- [x] Secure api-football proxy + caching (100 req/day free tier)
- [x] Odds engine with configurable house margin (profit lever)
- [x] Real-data integration verified (64 Qatar 2022 fixtures); free-plan 2026
      restriction handled via mock fallback

## Phase B — UI/UX overhaul (IN PROGRESS)
- [x] Fix white screen (missing entry `<script>`), favicon + proper assets
- [x] Large-screen UI redesigned (sidebar + centered markets + sticky bet slip)
- [x] Responsive: mobile bottom-nav + bet-slip modal
- [x] Football-only (FIFA World Cup)
- [x] URL routing + public browsing, auth-gated betting (login/KYC per-action)
- [x] Profile & Wallet redesigned; clean payment badges
- [x] Global currency conversion (live FX) with side-drawer picker
- [x] Empty states, bet-success screen, insufficient-balance fail state
- [x] Error boundary (no more blank-screen crashes)
- [x] Terms / Privacy / Responsible-Gaming pages + footer + signup consent
- [ ] (optional later) loading skeletons, restyle StandingsTable/Toast/Top-Up
      modals, 404 page

## Phase 3 — Wallet, bets & settlement (server-side)  ← CURRENT
Identity note: auth is Phase 5, so Phase 3 keys accounts by a per-device id
(`X-Device-Id`, a UUID stored in the browser). When Firebase auth lands, device
accounts migrate to real users. Build with an in-memory repo first (no infra),
then swap in MongoDB — clean architecture makes the repo a drop-in.
- [ ] Backend domain: Wallet, Bet, Transaction (+ ledger)
- [ ] In-memory repository (runs with zero setup) behind a repo interface
- [ ] Server-authoritative wallet (top-up/withdraw) + place-bet usecases
- [ ] Settlement worker: settle pending bets from real match results (HT + FT),
      replacing the front-end Math.random simulation
- [ ] HTTP endpoints; wire the front-end wallet hook to the backend
- [ ] MongoDB (Atlas free tier) repository — **needs a connection string** when
      we're ready to persist; goals markets (O/U, BTTS) plug in here
- [ ] (optional) Redis for shared cache + rate-limit/session store

## Phase 4 — Payments & KYC
- [ ] Wallet-first top-up: crypto (NOWPayments/BTCPay) + mobile money + card
- [ ] Withdrawals
- [ ] KYC via Didit (free tier), behind a swappable interface

## Phase 5 — Auth (LAST)
- [ ] Firebase Auth (Google + phone OTP) verified server-side in Go middleware
- [ ] **Access levels / user roles** (user, admin, etc.)

## Phase 6 — Dashboards
- [ ] User dashboard (bets, P&L, history)
- [ ] Admin dashboard (matches, odds, users, transactions, role management)

## Cross-cutting / non-functional (apply throughout)
- [ ] **Input validation** (client + server)
- [ ] **Rate limiting** (per-IP / per-user; Redis-backed when available)
- [ ] **Error handling** everywhere (consistent API error shapes + UI surfacing)
- [ ] **Proper routing** (frontend router; clean REST routes already started)
- [ ] **Load balancing** (deploy behind a balancer; stateless API for horizontal scale)
- [ ] Responsible gambling + legal disclaimers (see docs/PROFIT.md, licensing notes)
