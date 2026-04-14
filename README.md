# ⚽ football-data.org → Supabase Sync Service

Pulls World Cup data from [football-data.org](https://football-data.org) and stores it in Supabase. Runs on a cron schedule and exposes an HTTP endpoint for manual triggers.

## Synced endpoints

| Endpoint | Supabase Table | Key |
|---|---|---|
| `GET /v4/competitions` | `fd_competitions` | `id` |
| `GET /v4/competitions/2000/teams` | `fd_teams` | `id` |
| `GET /v4/competitions/2000/standings` | `fd_standings` | `competition_id, season_id, stage, group, team_id` |
| `GET /v4/competitions/2000/matches` | `fd_matches` | `id` |
| `GET /v4/competitions/2000/scorers` | `fd_scorers` | `competition_id, season_id, player_id` |

All syncs are **idempotent** — safe to re-run at any time.

## Project structure

```
src/
├── index.ts          # Express server + cron scheduler
├── sync.ts           # Orchestrates all 5 sync tasks
├── externalApi.ts    # football-data.org API client
├── supabaseClient.ts # Supabase client singleton
└── types.ts          # TypeScript types for all API responses
supabase-schema.sql   # Run this first in Supabase SQL editor
```

## Setup

### 1. Create Supabase tables
Open your Supabase project → SQL editor → paste and run `supabase-schema.sql`.

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API |
| `FOOTBALL_API_KEY` | [football-data.org](https://www.football-data.org/client/register) account |
| `CRON_SCHEDULE` | Cron expression — see [crontab.guru](https://crontab.guru) |

### 4. Run

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/sync` | Trigger a full sync now |
| `GET` | `/schedule` | View current cron schedule |

```bash
# Trigger a sync manually
curl -X POST http://localhost:3000/sync
```

### Example response
```json
{
  "success": true,
  "synced": {
    "competitions": 10,
    "teams": 32,
    "standings": 96,
    "matches": 64,
    "scorers": 25
  },
  "errors": [],
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

If some tasks fail and others succeed, the HTTP status will be `207 Multi-Status` and the `errors` array will describe which tasks failed.

## Deployment (Railway / Render)

1. Push repo to GitHub
2. Create a new service pointing to the repo
3. Add env vars from `.env.example` in the platform dashboard
4. Set start command: `npm run build && npm start`
