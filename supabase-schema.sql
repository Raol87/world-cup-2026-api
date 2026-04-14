-- ─────────────────────────────────────────────────────────────────────────────
-- football-data.org — Supabase Schema
-- Run this in your Supabase SQL editor before starting the sync service
-- ─────────────────────────────────────────────────────────────────────────────

-- Competitions
create table if not exists fd_competitions (
  id                            integer primary key,
  name                          text not null,
  code                          text,
  type                          text,
  emblem                        text,
  area_id                       integer,
  area_name                     text,
  area_code                     text,
  area_flag                     text,
  current_season_id             integer,
  current_season_start          date,
  current_season_end            date,
  current_matchday              integer,
  number_of_available_seasons   integer,
  last_updated                  timestamptz,
  synced_at                     timestamptz
);

-- Teams
create table if not exists fd_teams (
  id              integer primary key,
  name            text not null,
  short_name      text,
  tla             text,
  crest           text,
  address         text,
  website         text,
  founded         integer,
  club_colors     text,
  venue           text,
  area_id         integer,
  area_name       text,
  competition_id  integer references fd_competitions(id),
  last_updated    timestamptz,
  synced_at       timestamptz
);

-- Standings
-- Composite PK: a team's entry per competition/season/stage/group
create table if not exists fd_standings (
  competition_id  integer references fd_competitions(id),
  season_id       integer not null,
  stage           text not null,
  type            text,
  "group"         text,
  position        integer,
  team_id         integer references fd_teams(id),
  team_name       text,
  played_games    integer,
  form            text,
  won             integer,
  draw            integer,
  lost            integer,
  points          integer,
  goals_for       integer,
  goals_against   integer,
  goal_difference integer,
  synced_at       timestamptz,
  primary key (competition_id, season_id, stage, "group", team_id)
);

-- Matches
create table if not exists fd_matches (
  id              integer primary key,
  competition_id  integer references fd_competitions(id),
  season_id       integer,
  utc_date        timestamptz,
  status          text,
  matchday        integer,
  stage           text,
  "group"         text,
  home_team_id    integer references fd_teams(id),
  home_team_name  text,
  away_team_id    integer references fd_teams(id),
  away_team_name  text,
  winner          text,
  duration        text,
  full_time_home  integer,
  full_time_away  integer,
  half_time_home  integer,
  half_time_away  integer,
  last_updated    timestamptz,
  synced_at       timestamptz
);

-- Scorers
-- Composite PK: a player's stats per competition/season
create table if not exists fd_scorers (
  competition_id    integer references fd_competitions(id),
  season_id         integer not null,
  player_id         integer not null,
  player_name       text,
  player_first_name text,
  player_last_name  text,
  date_of_birth     date,
  nationality       text,
  position          text,
  shirt_number      integer,
  team_id           integer references fd_teams(id),
  team_name         text,
  played_matches    integer,
  goals             integer,
  assists           integer,
  penalties         integer,
  synced_at         timestamptz,
  primary key (competition_id, season_id, player_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Optional: useful indexes
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists idx_matches_competition on fd_matches(competition_id);
create index if not exists idx_matches_status      on fd_matches(status);
create index if not exists idx_matches_utc_date    on fd_matches(utc_date);
create index if not exists idx_standings_comp      on fd_standings(competition_id, season_id);
create index if not exists idx_scorers_goals       on fd_scorers(goals desc);
