import type {
  CompetitionListResponse,
  StandingsResponse,
  MatchesResponse,
  TeamsResponse,
  ScorersResponse,
} from "./types";

const BASE_URL = "https://api.football-data.org";
const API_KEY = process.env.FOOTBALL_API_KEY;

if (!API_KEY) {
  throw new Error("Missing FOOTBALL_API_KEY in environment variables.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Base fetcher — handles auth + error handling
// ─────────────────────────────────────────────────────────────────────────────

async function footballFetch<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  console.log(`  → GET ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Auth-Token": API_KEY!,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`football-data.org error ${response.status} for ${path}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Endpoint methods
// ─────────────────────────────────────────────────────────────────────────────

/** GET /v4/competitions — list all available competitions */
export async function fetchCompetitions(): Promise<CompetitionListResponse> {
  return footballFetch<CompetitionListResponse>("/v4/competitions");
}

/** GET /v4/competitions/:id/standings */
export async function fetchStandings(competitionId: number | string): Promise<StandingsResponse> {
  return footballFetch<StandingsResponse>(`/v4/competitions/${competitionId}/standings`);
}

/** GET /v4/competitions/:id/matches */
export async function fetchMatches(competitionId: number | string): Promise<MatchesResponse> {
  return footballFetch<MatchesResponse>(`/v4/competitions/${competitionId}/matches`);
}

/** GET /v4/competitions/:id/teams */
export async function fetchTeams(competitionId: number | string): Promise<TeamsResponse> {
  return footballFetch<TeamsResponse>(`/v4/competitions/${competitionId}/teams`);
}

/** GET /v4/competitions/:id/scorers */
export async function fetchScorers(competitionId: number | string): Promise<ScorersResponse> {
  return footballFetch<ScorersResponse>(`/v4/competitions/${competitionId}/scorers`);
}

/** GET /v4/matches — today's matches across all competitions (API returns today by default) */
export async function fetchTodayMatches(): Promise<MatchesResponse> {
  return footballFetch<MatchesResponse>("/v4/matches");
}
