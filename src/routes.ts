import { Router, Request, Response } from "express";
import { supabase } from "./supabaseClient";
import { syncTodayMatches } from "./sync";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Competitions
// GET /api/competitions
// GET /api/competitions/:id
// ─────────────────────────────────────────────────────────────────────────────

router.get("/competitions", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("fd_competitions")
    .select("*")
    .order("name");

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.get("/competitions/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("fd_competitions")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Competition not found" });
  return res.json(data);
});

// ─────────────────────────────────────────────────────────────────────────────
// Teams
// GET /api/teams
// GET /api/teams/:id
// ─────────────────────────────────────────────────────────────────────────────

router.get("/teams", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("fd_teams")
    .select("*")
    .order("name");

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.get("/teams/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("fd_teams")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Team not found" });
  return res.json(data);
});

// ─────────────────────────────────────────────────────────────────────────────
// Standings
// GET /api/standings                  — all standings
// GET /api/standings?stage=GROUP_STAGE&group=GROUP_A
// ─────────────────────────────────────────────────────────────────────────────

router.get("/standings", async (req: Request, res: Response) => {
  let query = supabase
    .from("fd_standings")
    .select("*")
    .order("points", { ascending: false })
    .order("goal_difference", { ascending: false });

  if (req.query.stage) {
    query = query.eq("stage", req.query.stage as string);
  }
  if (req.query.group) {
    query = query.eq("group", req.query.group as string);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// ─────────────────────────────────────────────────────────────────────────────
// Matches
// GET /api/matches                    — all matches
// GET /api/matches?status=FINISHED
// GET /api/matches?status=SCHEDULED
// GET /api/matches?stage=GROUP_STAGE
// GET /api/matches?team_id=123        — matches for a specific team
// GET /api/matches/:id                — single match
// ─────────────────────────────────────────────────────────────────────────────

router.get("/matches", async (req: Request, res: Response) => {
  let query = supabase
    .from("fd_matches")
    .select("*")
    .order("utc_date", { ascending: true });

  if (req.query.status) {
    query = query.eq("status", req.query.status as string);
  }
  if (req.query.stage) {
    query = query.eq("stage", req.query.stage as string);
  }
  if (req.query.team_id) {
    const teamId = req.query.team_id as string;
    query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.get("/matches/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("fd_matches")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Match not found" });
  return res.json(data);
});

// ─────────────────────────────────────────────────────────────────────────────
// Scorers
// GET /api/scorers                    — top scorers, sorted by goals
// GET /api/scorers?team_id=123
// ─────────────────────────────────────────────────────────────────────────────

router.get("/scorers", async (req: Request, res: Response) => {
  let query = supabase
    .from("fd_scorers")
    .select("*")
    .order("goals", { ascending: false });

  if (req.query.team_id) {
    query = query.eq("team_id", req.query.team_id as string);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// ─────────────────────────────────────────────────────────────────────────────
// Today's Matches
// GET  /api/today-matches         — read cached today's matches from DB
// POST /api/today-matches/sync    — fetch from football-data.org and refresh DB
// ─────────────────────────────────────────────────────────────────────────────

router.get("/today-matches", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("fd_today_matches")
    .select("*")
    .order("utc_date", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.post("/today-matches/sync", async (_req: Request, res: Response) => {
  try {
    const result = await syncTodayMatches();
    return res.json({
      success: true,
      synced: result.synced,
      deleted: result.deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
