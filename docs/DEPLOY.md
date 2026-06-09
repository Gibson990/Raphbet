# Deploying Raphbet

The stack is three services: **MongoDB**, the **Go API**, and the **static web** app.

## Option A — Docker Compose (single box / VPS)

```bash
# from the repo root, with backend/.env filled in
docker compose up -d --build
# web on :3000, api on :8080, mongo on :27017
```

`docker-compose.yml` builds both images, points the API at the bundled Mongo, and
serves the web build via nginx (with SPA routing).

## Option B — Managed hosts (recommended for production)

- **API** → Render / Railway / Fly.io (each can build `backend/Dockerfile`).
- **Web** → Vercel / Netlify / Cloudflare Pages (build `npm run build`, output `dist/`).
  Set `VITE_API_BASE_URL` to the API's public URL at build time.
- **MongoDB** → MongoDB Atlas (managed, with backups). Set `MONGO_URI`.

## Required environment (backend)

| Var | Purpose |
|-----|---------|
| `MONGO_URI`, `MONGO_DB` | persistence (Atlas in prod) |
| `ALLOWED_ORIGINS` | the web app's public origin(s), CSV |
| `INITIAL_BALANCE` | `0` in production (no free credits) |
| `ADMIN_KEY` | admin API key (replace with Firebase admin role) |
| `API_SPORTS_KEY`, `SEASON` | live football data (paid plan for 2026) |
| `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_CALLBACK_URL` | crypto deposits |
| `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET` | KYC |
| `HOUSE_MARGIN`, `MIN_BET`, `MAX_BET`, `MIN_WITHDRAWAL`, `MAX_WITHDRAWAL` | risk |
| `RATE_LIMIT_PER_MIN` | per-IP rate limit (default 120) |

Never commit `.env` — it's gitignored. Use the host's secrets manager.

## CI

`.github/workflows/ci.yml` runs on every push/PR: backend `go build / vet / test`
and frontend `tsc --noEmit / build`.

## Production checklist (still outstanding)

- [ ] **HTTPS/TLS** in front of the API (host-managed or a reverse proxy)
- [ ] **DB backups** (Atlas automated backups)
- [ ] **Monitoring**: error tracking (Sentry) + uptime + alerts
- [ ] **Single settlement instance** — run exactly one API replica with the
      settlement worker, or add a leader lock, so bets aren't double-settled
- [ ] **NOWPayments payouts** setup (2FA + IP whitelist + balance) for automated
      withdrawals
- [ ] **Gambling licence** + responsible-gambling tools before real-money launch
