// ─────────────────────────────────────────────────────────────────────────────
// football-data.org v4 — Shared Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Area {
  id: number;
  name: string;
  code: string | null;
  flag: string | null;
}

export interface Season {
  id: number;
  startDate: string;
  endDate: string;
  currentMatchday: number | null;
  winner: Team | null;
}

export interface Competition {
  id: number;
  name: string;
  code: string;
  type: string;
  emblem: string | null;
  area: Area;
  currentSeason: Season | null;
  numberOfAvailableSeasons: number;
  lastUpdated: string;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string | null;
  address?: string;
  website?: string;
  founded?: number | null;
  clubColors?: string | null;
  venue?: string | null;
  area?: Area;
  lastUpdated?: string;
}

export interface Standing {
  position: number;
  team: Team;
  playedGames: number;
  form: string | null;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface StandingTable {
  stage: string;
  type: string;
  group: string | null;
  table: Standing[];
}

export interface Score {
  winner: string | null;
  duration: string;
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface Referee {
  id: number;
  name: string;
  type: string;
  nationality: string | null;
}

export interface Match {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  group: string | null;
  lastUpdated: string;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
  referees: Referee[];
  competition?: Competition;
  area?: Area;
  season?: Season;
}

export interface Scorer {
  player: {
    id: number;
    name: string;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
    position: string | null;
    shirtNumber: number | null;
    lastUpdated: string;
  };
  team: Team;
  playedMatches: number;
  goals: number;
  assists: number | null;
  penalties: number | null;
}

// ─── API Response shapes ───────────────────────────────────────────────────

export interface CompetitionListResponse {
  count: number;
  competitions: Competition[];
}

export interface StandingsResponse {
  competition: Competition;
  season: Season;
  standings: StandingTable[];
}

export interface MatchesResponse {
  matches: Match[];
  resultSet: {
    count: number;
    competitions: string;
    first: string;
    last: string;
    played: number;
  };
}

export interface TeamsResponse {
  count: number;
  competition: Competition;
  season: Season;
  teams: Team[];
}

export interface ScorersResponse {
  count: number;
  competition: Competition;
  season: Season;
  scorers: Scorer[];
}
