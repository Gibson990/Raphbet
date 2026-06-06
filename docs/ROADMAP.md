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
- [ ] **Large-screen UI totally redesigned to top-betting-app / industry
      standard** (sidebar nav + centered markets + sticky bet slip; FanDuel /
      bet365 / DraftKings patterns: clarity first, legible odds, stable bet slip)
- [ ] Responsive: keep mobile bottom-nav + bet-slip modal
- [ ] Football-only: remove any non-football sports references/branding
- [ ] Empty states, progress bars, success/fail screens, clear error messages
- [ ] Terms & Conditions / policies screens (reachable, required at signup)

## Phase 3 — Wallet, bets & settlement (server-side)
- [ ] MongoDB setup (Atlas free tier) + data model (users, wallets, bets, txns)
- [ ] Server-authoritative wallet with double-entry ledger
- [ ] Place-bet + real settlement from match results (replace Math.random)
- [ ] State management: optional Redis — if introduced, use it for caching too
      (shared cache + session/rate-limit store)

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
