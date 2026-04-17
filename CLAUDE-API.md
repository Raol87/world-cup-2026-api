# api-world-cup

Express + TypeScript service that syncs football-data.org data into Supabase and exposes a read API for a Vue frontend.

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **Database**: Supabase (Postgres via `@supabase/supabase-js`)
- **External API**: football-data.org v4
- **Scheduler**: `node-cron`
- **Process manager**: PM2 (`ecosystem.config.js`)

## Project structure

```
src/
  index.ts          — Express app setup, CORS, cron job, admin routes
  routes.ts         — Read API routes mounted at /api
  sync.ts           — Sync functions that fetch from football-data.org and upsert to Supabase
  externalApi.ts    — Typed wrappers around football-data.org endpoints
  supabaseClient.ts — Supabase client singleton
  types.ts          — Shared TypeScript interfaces for API responses
supabase-schema.sql — Full table definitions; run in Supabase SQL editor to initialise
ecosystem.config.js — PM2 config
```

## Environment variables

See `.env.example` for all required vars:

- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase project credentials
- `FOOTBALL_API_KEY` — football-data.org API key
- `ALLOWED_ORIGINS` — comma-separated list of origins allowed by CORS (the Vue app domain)
- `PORT` — defaults to `3000`
- `CRON_SCHEDULE` — cron expression for auto-sync, defaults to `0 * * * *` (hourly)

## Commands

```bash
npm run dev       # Run with ts-node (development)
npm run build     # Compile TypeScript to dist/
npm start         # Run compiled output

pm2 start ecosystem.config.js   # Start via PM2
pm2 restart world-cup-api       # Restart after a build
pm2 logs                        # Stream logs
```

## API endpoints

### Read (GET /api/...)

| Route | Description |
|---|---|
| `GET /api/competitions` | All competitions |
| `GET /api/competitions/:id` | Single competition |
| `GET /api/teams` | All teams |
| `GET /api/teams/:id` | Single team |
| `GET /api/standings` | Standings — filterable by `?stage=` and `?group=` |
| `GET /api/matches` | All matches — filterable by `?status=`, `?stage=`, `?team_id=` |
| `GET /api/matches/:id` | Single match |
| `GET /api/scorers` | Top scorers — filterable by `?team_id=` |
| `GET /api/today-matches` | Today's matches (cached in `fd_today_matches`) |

### Admin (no /api prefix)

| Route | Description |
|---|---|
| `POST /sync` | Trigger a full sync of all tables including today's matches |
| `POST /api/today-matches/sync` | Sync only today's matches |
| `GET /health` | Health check |
| `GET /schedule` | Current cron schedule |

## Database tables

All tables are prefixed `fd_`. Defined in `supabase-schema.sql`.

| Table | Source | Notes |
|---|---|---|
| `fd_competitions` | `/v4/competitions` | Upserted on `id` |
| `fd_teams` | `/v4/competitions/2000/teams` | Upserted on `id` |
| `fd_standings` | `/v4/competitions/2000/standings` | Composite PK on `competition_id, season_id, stage, group, team_id` |
| `fd_matches` | `/v4/competitions/2000/matches` | Upserted on `id` — full tournament schedule |
| `fd_scorers` | `/v4/competitions/2000/scorers` | Composite PK on `competition_id, season_id, player_id` |
| `fd_today_matches` | `/v4/matches` | Ephemeral — stale rows (previous days) are deleted on each sync; `referees` stored as JSONB |

## How syncing works

`runSync()` in `sync.ts` runs all sync tasks sequentially. Each task fetches from football-data.org and upserts into Supabase. `today_matches` additionally deletes rows whose `match_date` doesn't match today before upserting.

Sync is triggered:
1. Automatically by the cron job (configured via `CRON_SCHEDULE`)
2. Manually via `POST /sync`

The World Cup competition ID is hardcoded as `WORLD_CUP_ID = 2000`.

## CORS

Only origins listed in `ALLOWED_ORIGINS` are permitted. Server-to-server requests (no `Origin` header) are always allowed — safe for curl/Postman and internal callers.
