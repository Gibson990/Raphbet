# Raphbet Backend (Go)

Read-only football data API for the Raphbet app. Built with the Go standard
library only (no third-party dependencies) using a clean / hexagonal layout.

## Architecture

```
cmd/api/                 entrypoint + dependency wiring
internal/
  config/                env-based configuration
  domain/                core entities + ports (interfaces)
  usecase/
    football/            application service (orchestration)
    odds/                odds generation with the house margin (profit lever)
  infra/football/        api-football client, mock provider, caching decorator
  delivery/http/         HTTP handlers, router, CORS + logging middleware
```

Data flows: `delivery → usecase → domain ← infra`. The use case layer depends
only on `domain` interfaces, so the data provider (real API vs mock) and the
odds source are swappable without touching business logic.

## Run locally

```bash
cd backend
cp .env.example .env        # optional; runs with mock data if omitted
go run ./cmd/api
```

The server listens on `:8080`. Without `API_SPORTS_KEY` it serves built-in
mock FIFA World Cup data so the whole app works offline.

## Endpoints

| Method | Path                              | Description                |
|--------|-----------------------------------|----------------------------|
| GET    | `/health`                         | Liveness check             |
| GET    | `/api/leagues`                    | Available competitions     |
| GET    | `/api/leagues/{id}/matches`       | Fixtures + live + finished |
| GET    | `/api/leagues/{id}/standings`     | League table               |

World Cup league id is `1`.

## Free-tier note

api-football's free plan allows ~100 requests/day. The caching layer fetches
once and serves all users: fixtures hourly, standings every 6h, and live scores
every 30s only while a match is in play.
