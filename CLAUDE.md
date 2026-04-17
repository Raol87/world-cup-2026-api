# World Cup 2026 — Project Context for Claude

## Project Overview

This is a two-part project:

1. **world-cup-2026-api** — A Node.js/TypeScript sync service that pulls data from football-data.org and stores it in Supabase. Also exposes a read API for other apps to consume.
2. **world-cup-pool** — A React/TypeScript pool app where friends predict World Cup results and compete on a leaderboard.

---

## Repository Layout

```
world-cup-2026-api/          ← sync service + read API
world-cup-pool/              ← React pool app
```

---

## 1. world-cup-2026-api

### What it does
- Fetches data from football-data.org v4 API on a cron schedule (default: every hour)
- Exposes a `POST /sync` endpoint to trigger a manual sync
- Exposes read-only `GET /api/*` endpoints for the pool app and other consumers
- Runs on the server via PM2 on port 3005

### Stack
- Node.js + TypeScript
- Express
- node-cron
- @supabase/supabase-js
- cors

### Key files
```
src/
├── index.ts          # Express server, cron scheduler, CORS setup
├── sync.ts           # Orchestrates all 5 sync tasks
├── externalApi.ts    # football-data.org API client (X-Auth-Token header)
├── supabaseClient.ts # Supabase service role client (server-side only)
├── routes.ts         # Read API routes (/api/competitions, /api/matches, etc.)
└── types.ts          # TypeScript types for all football-data.org responses
```

### Environment variables
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # service role — never expose to browser
FOOTBALL_API_KEY=               # X-Auth-Token header for football-data.org
ALLOWED_ORIGINS=                # comma-separated list of allowed browser origins
PORT=3005
CRON_SCHEDULE=0 * * * *
```

### Commands
```bash
npm run dev       # Run with ts-node (development)
npm run build     # Compile TypeScript to dist/
npm start         # Run compiled output

pm2 start ecosystem.config.js   # Start via PM2
pm2 restart world-cup-api       # Restart after a build
pm2 logs                        # Stream logs
```

### Read API endpoints
```
GET  /health
POST /sync
POST /api/today-matches/sync    # Sync only today's matches
GET  /api/competitions
GET  /api/competitions/:id
GET  /api/teams
GET  /api/teams/:id
GET  /api/standings?stage=GROUP_STAGE&group=GROUP_A
GET  /api/matches?status=FINISHED&stage=GROUP_STAGE&team_id=123
GET  /api/matches/:id
GET  /api/scorers?team_id=123
GET  /api/today-matches
```

### Football data competition
- World Cup 2026 = competition ID **2000** on football-data.org
- Auth: `X-Auth-Token` header (not Bearer)

### CORS
Only origins listed in `ALLOWED_ORIGINS` are permitted. Server-to-server requests (no `Origin` header) are always allowed — safe for curl/Postman and internal callers.

### Deployment
- Runs on Ubuntu home server via PM2
- Config: `ecosystem.config.js` with `cwd` and `env_file` set explicitly
- Start: `npm run build && pm2 restart world-cup-api`

---

## 2. world-cup-pool

### What it does
- Pool app for friends to predict World Cup 2026 results
- Users register with an invite code, submit picks, and compete on a leaderboard
- Picks are locked at tournament kickoff: **June 11, 2026**

### Stack
- React 18 + TypeScript
- Vite
- Tailwind CSS (dark/sporty theme — pitch green + gold)
- react-router-dom v6
- @tanstack/react-query
- @supabase/supabase-js (anon key, browser-safe)

### Design system
- Background: `#050f05` (pitch-950)
- Accent: `#e6b800` (gold-500), `#f5c842` (gold-400)
- Fonts: Bebas Neue (display/headings) + DM Sans (body)
- Sharp edges (no border-radius), uppercase tracking, bold sports aesthetic
- CSS utility classes: `.btn-primary`, `.btn-ghost`, `.card`, `.card-accent`, `.input`, `.tag`, `.section-title`

### Key files
```
src/
├── App.tsx                     # Router + providers
├── main.tsx
├── index.css                   # Global styles + Tailwind
├── types/index.ts              # All types + SCORING_WEIGHTS
├── lib/
│   ├── supabase.ts             # Supabase anon client
│   └── api.ts                  # Fetches from world-cup-2026-api service
├── hooks/
│   └── useAuth.tsx             # Auth context + invite code validation
├── components/
│   ├── Navbar.tsx
│   └── ProtectedRoute.tsx
└── pages/
    ├── LoginPage.tsx
    ├── RegisterPage.tsx
    ├── LeaderboardPage.tsx
    ├── MatchesPage.tsx
    ├── StandingsPage.tsx
    └── PicksPage.tsx           # Group stage + playoff bracket picks
```

### Environment variables
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=        # anon/public key — safe for browser
VITE_API_URL=http://localhost:3005
```

### Routes
```
/login
/register
/leaderboard    (protected)
/matches        (protected)
/standings      (protected)
/picks          (protected)
```

---

## Supabase (shared project)

Both apps use the **same Supabase project**. The sync service uses the service role key; the pool app uses the anon key.

### Tables — competition data (written by sync service)
```
fd_competitions
fd_teams
fd_standings       # composite PK: competition_id, season_id, stage, group, team_id
fd_matches
fd_scorers         # composite PK: competition_id, season_id, player_id
fd_today_matches   # ephemeral — stale rows (previous days) deleted on each sync; referees stored as JSONB
```

### Tables — pool data (written by pool app)
```
pool_users         # mirrors auth.users
pool_invite_codes  # invite codes to control registration
pool_group_picks   # predicted group stage standings per user
pool_playoff_picks # predicted bracket picks per user
pool_leaderboard   # pre-calculated scores (updated after each matchday)
```

### Row Level Security
- All pool tables have RLS enabled
- Users can read all picks/leaderboard
- Users can only write their own picks
- Service role key bypasses RLS (used by sync service only)

### Invite codes
10 codes seeded in `supabase-schema.sql`. Add more with:
```sql
insert into pool_invite_codes (code) values ('YOURCODE');
```

---

## Scoring System

| Pick | Points |
|---|---|
| Group stage position correct | 1 pt each |
| Round of 32 correct | 2 pts each |
| Round of 16 correct | 4 pts each |
| Quarter finals correct | 8 pts each |
| Semi finals correct | 16 pts each |
| Third place correct | 16 pts |
| Champion correct | 32 pts |

Scoring weights are defined in `src/types/index.ts` as `SCORING_WEIGHTS`.

The `pool_leaderboard` table stores pre-calculated scores. A scoring calculation function needs to be built that compares picks against actual results in `fd_standings` and `fd_matches`.

---

## What's not built yet

- **Leaderboard scoring function** — needs to compare `pool_group_picks` against actual `fd_standings` results and `pool_playoff_picks` against actual `fd_matches` outcomes, then upsert into `pool_leaderboard`
- **Admin panel** — for managing invite codes and viewing all user picks
- **Cloudflare Tunnel / public access** — server is currently only accessible on local network
- **Pick submission confirmation UI** — currently just saves silently with a brief "Saved!" flash
- **View other users' picks** — after tournament starts, picks should be visible to all participants
- **Mobile nav improvements** — hamburger menu for smaller screens
