import { supabase } from "./supabaseClient";
import {
  fetchCompetitions,
  fetchStandings,
  fetchMatches,
  fetchTeams,
  fetchScorers,
} from "./externalApi";

// World Cup competition ID on football-data.org
const WORLD_CUP_ID = 2000;

export interface SyncResult {
  success: boolean;
  synced: Partial<Record<string, number>>;
  errors: string[];
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual sync functions
// ─────────────────────────────────────────────────────────────────────────────

async function syncCompetitions(timestamp: string): Promise<number> {
  const data = await fetchCompetitions();

  const rows = data.competitions.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    type: c.type,
    emblem: c.emblem,
    area_id: c.area?.id ?? null,
    area_name: c.area?.name ?? null,
    area_code: c.area?.code ?? null,
    area_flag: c.area?.flag ?? null,
    current_season_id: c.currentSeason?.id ?? null,
    current_season_start: c.currentSeason?.startDate ?? null,
    current_season_end: c.currentSeason?.endDate ?? null,
    current_matchday: c.currentSeason?.currentMatchday ?? null,
    number_of_available_seasons: c.numberOfAvailableSeasons,
    last_updated: c.lastUpdated,
    synced_at: timestamp,
  }));

  const { error, count } = await supabase
    .from("fd_competitions")
    .upsert(rows, { onConflict: "id", count: "exact" });

  if (error) throw new Error(`competitions upsert: ${error.message}`);
  return count ?? rows.length;
}

async function syncTeams(timestamp: string): Promise<number> {
  const data = await fetchTeams(WORLD_CUP_ID);

  const rows = data.teams.map((t) => ({
    id: t.id,
    name: t.name,
    short_name: t.shortName,
    tla: t.tla,
    crest: t.crest,
    address: t.address ?? null,
    website: t.website ?? null,
    founded: t.founded ?? null,
    club_colors: t.clubColors ?? null,
    venue: t.venue ?? null,
    area_id: t.area?.id ?? null,
    area_name: t.area?.name ?? null,
    competition_id: WORLD_CUP_ID,
    last_updated: t.lastUpdated ?? null,
    synced_at: timestamp,
  }));

  const { error, count } = await supabase
    .from("fd_teams")
    .upsert(rows, { onConflict: "id", count: "exact" });

  if (error) throw new Error(`teams upsert: ${error.message}`);
  return count ?? rows.length;
}

async function syncStandings(timestamp: string): Promise<number> {
  const data = await fetchStandings(WORLD_CUP_ID);

  const rows = data.standings.flatMap((table) =>
    table.table.map((entry) => ({
      competition_id: data.competition.id,
      season_id: data.season.id,
      stage: table.stage,
      type: table.type,
      group: table.group ?? null,
      position: entry.position,
      team_id: entry.team.id,
      team_name: entry.team.name,
      played_games: entry.playedGames,
      form: entry.form ?? null,
      won: entry.won,
      draw: entry.draw,
      lost: entry.lost,
      points: entry.points,
      goals_for: entry.goalsFor,
      goals_against: entry.goalsAgainst,
      goal_difference: entry.goalDifference,
      synced_at: timestamp,
    }))
  );

  const { error, count } = await supabase
    .from("fd_standings")
    .upsert(rows, {
      onConflict: "competition_id,season_id,stage,group,team_id",
      count: "exact",
    });

  if (error) throw new Error(`standings upsert: ${error.message}`);
  return count ?? rows.length;
}

async function syncMatches(timestamp: string): Promise<number> {
  const data = await fetchMatches(WORLD_CUP_ID);

  const rows = data.matches.map((m) => ({
    id: m.id,
    competition_id: WORLD_CUP_ID,
    season_id: m.season?.id ?? null,
    utc_date: m.utcDate,
    status: m.status,
    matchday: m.matchday ?? null,
    stage: m.stage,
    group: m.group ?? null,
    home_team_id: m.homeTeam.id,
    home_team_name: m.homeTeam.name,
    away_team_id: m.awayTeam.id,
    away_team_name: m.awayTeam.name,
    winner: m.score.winner ?? null,
    duration: m.score.duration,
    full_time_home: m.score.fullTime.home ?? null,
    full_time_away: m.score.fullTime.away ?? null,
    half_time_home: m.score.halfTime.home ?? null,
    half_time_away: m.score.halfTime.away ?? null,
    last_updated: m.lastUpdated,
    synced_at: timestamp,
  }));

  const { error, count } = await supabase
    .from("fd_matches")
    .upsert(rows, { onConflict: "id", count: "exact" });

  if (error) throw new Error(`matches upsert: ${error.message}`);
  return count ?? rows.length;
}

async function syncScorers(timestamp: string): Promise<number> {
  const data = await fetchScorers(WORLD_CUP_ID);

  const rows = data.scorers.map((s) => ({
    competition_id: data.competition.id,
    season_id: data.season.id,
    player_id: s.player.id,
    player_name: s.player.name,
    player_first_name: s.player.firstName ?? null,
    player_last_name: s.player.lastName ?? null,
    date_of_birth: s.player.dateOfBirth ?? null,
    nationality: s.player.nationality ?? null,
    position: s.player.position ?? null,
    shirt_number: s.player.shirtNumber ?? null,
    team_id: s.team.id,
    team_name: s.team.name,
    played_matches: s.playedMatches,
    goals: s.goals,
    assists: s.assists ?? null,
    penalties: s.penalties ?? null,
    synced_at: timestamp,
  }));

  const { error, count } = await supabase
    .from("fd_scorers")
    .upsert(rows, {
      onConflict: "competition_id,season_id,player_id",
      count: "exact",
    });

  if (error) throw new Error(`scorers upsert: ${error.message}`);
  return count ?? rows.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Master sync — runs all endpoints, collects results
// ─────────────────────────────────────────────────────────────────────────────

export async function runSync(): Promise<SyncResult> {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] Starting football-data sync (World Cup / id:${WORLD_CUP_ID})...`);

  const synced: Record<string, number> = {};
  const errors: string[] = [];

  const tasks: Array<{ name: string; fn: () => Promise<number> }> = [
    { name: "competitions", fn: () => syncCompetitions(timestamp) },
    { name: "teams",        fn: () => syncTeams(timestamp) },
    { name: "standings",    fn: () => syncStandings(timestamp) },
    { name: "matches",      fn: () => syncMatches(timestamp) },
    { name: "scorers",      fn: () => syncScorers(timestamp) },
  ];

  for (const task of tasks) {
    try {
      console.log(`  Syncing ${task.name}...`);
      const count = await task.fn();
      synced[task.name] = count;
      console.log(`  ✓ ${task.name}: ${count} rows upserted`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[${task.name}] ${msg}`);
      console.error(`  ✗ ${task.name} failed: ${msg}`);
    }
  }

  const success = errors.length === 0;
  console.log(`\nSync complete. Success: ${success}. Errors: ${errors.length}`);

  return { success, synced, errors, timestamp };
}
