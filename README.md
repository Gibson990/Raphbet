# Raphbet — FIFA World Cup betting app

A simple football betting app focused on the FIFA World Cup. Monorepo with a
clearly separated frontend and backend.

```
Raphbet/
├── frontend/   React 19 + Vite + TypeScript (UI)
├── backend/    Go API (clean architecture) — football data + odds
└── docs/       PROFIT.md and other docs
```

## Run locally

You need two terminals.

**1. Backend** (Go 1.24+) — serves live World Cup data (mock data until an
api-football key is set, so it works with zero setup):

```bash
cd backend
go run ./cmd/api          # listens on http://localhost:8080
```

**2. Frontend** (Node 20+):

```bash
cd frontend
npm install
npm run dev               # opens http://localhost:3000
```

Open <http://localhost:3000>. The UI fetches leagues, fixtures, live scores and
standings from the backend.

## Going live with real World Cup data

1. Create a free api-football account at <https://www.api-football.com/>
   (free tier = 100 requests/day).
2. `cd backend && cp .env.example .env`, then set `API_SPORTS_KEY=<your key>`.
3. Restart the backend. It now serves real FIFA World Cup (league id `1`) data.

The caching layer keeps usage inside the free tier (fixtures hourly, standings
every 6h, live scores every 30s only while a match is in play).

## Roadmap

- [x] **Phase C** — live World Cup data via secure backend proxy + odds engine
- [ ] **Phase B** — responsive desktop/large-screen UI
- [ ] **Phase 3** — server-side wallet, bets and real settlement
- [ ] **Phase 4** — payments (mobile money / card / crypto) + KYC
- [ ] **Phase 5** — auth (Firebase or Supabase)

See `docs/PROFIT.md` for the revenue model.
