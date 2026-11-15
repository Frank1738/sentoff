// Slimmed FPL payloads. Every field notes the API field it came from.

/** One player, slimmed from `bootstrap-static` `elements[]`. */
export interface Player {
  /** elements[].id */
  id: number;
  /** elements[].web_name, capped at 40 characters */
  name: string;
  /** elements[].element_type: 1 GK, 2 DEF, 3 MID, 4 FWD */
  position: number;
  /** teams[].short_name for elements[].team */
  team: string;
  /** elements[].selected_by_percent, parsed to a number */
  ownership: number;
  /** elements[].total_points */
  totalPoints: number;
}

/** One gameweek, slimmed from `bootstrap-static` `events[]`. */
export interface GameweekInfo {
  /** events[].id */
  id: number;
  /** events[].finished: false while the gameweek is live */
  finished: boolean;
  /** events[].deadline_time, ISO 8601 */
  deadline: string;
  /** events[].top_element: the highest scoring player of that gameweek, null before it starts */
  topPlayer: number | null;
}

/** The slimmed `bootstrap-static` file: gameweeks and the players index. */
export interface Bootstrap {
  /** events[] where is_current is true, 1 before the season starts */
  currentGameweek: number;
  /** events[] where is_current is true, finished flag */
  currentFinished: boolean;
  /** events[] where is_next is true, deadline_time */
  nextDeadline: string | null;
  gameweeks: GameweekInfo[];
  /** keyed by elements[].id */
  players: Record<number, Player>;
}

/** One row of `leagues-classic/{id}/standings/` `standings.results[]`. */
export interface LeagueEntry {
  /** results[].entry */
  entry: number;
  /** results[].player_name, capped at 40 characters */
  name: string;
  /** results[].entry_name, capped at 40 characters */
  teamName: string;
  /** results[].rank */
  rank: number;
  /** results[].last_rank, 0 in the first gameweek */
  lastRank: number;
  /** results[].total */
  totalPoints: number;
}

/** The slimmed standings call: league name plus the first page of entries. */
export interface Standings {
  /** league.id */
  leagueId: number;
  /** league.name, capped at 40 characters */
  leagueName: string;
  entries: LeagueEntry[];
}

/** A player's points per gameweek, from `element-summary/{id}/` `history[]`. */
export interface PlayerSummary {
  /** the element id asked for */
  id: number;
  /** history[].round to the sum of history[].total_points, so a double gameweek adds up */
  points: Record<number, number>;
}

/** One row of `entry/{id}/history/` `current[]`. */
export interface GameweekEntry {
  /** current[].event */
  gameweek: number;
  /** current[].points, before the transfer cost */
  points: number;
  /** current[].total_points */
  totalPoints: number;
  /** current[].overall_rank */
  overallRank: number;
  /** current[].points_on_bench, already post-autosub and with no captain multiplier */
  benchPoints: number;
  /** current[].event_transfers */
  transfers: number;
  /** current[].event_transfers_cost, the points paid for hits */
  transferCost: number;
}

/** One chip play, from `entry/{id}/history/` `chips[]`. */
export interface ChipPlay {
  /** chips[].name: wildcard, freehit, bboost, 3xc, manager */
  name: string;
  /** chips[].event */
  gameweek: number;
}

/** One transfer, from `entry/{id}/transfers/`. */
export interface Transfer {
  /** transfers[].event: the gameweek the transfer applies to */
  gameweek: number;
  /** transfers[].element_in */
  playerIn: number;
  /** transfers[].element_out */
  playerOut: number;
}

/** One squad slot, from `entry/{id}/event/{gw}/picks/` `picks[]`. */
export interface Pick {
  /** picks[].element */
  player: number;
  /** picks[].position, 1 to 11 start, 12 to 15 bench */
  slot: number;
  /** picks[].multiplier: 0 benched, 1 playing, 2 captain, 3 triple captain */
  multiplier: number;
  /** picks[].is_captain */
  isCaptain: boolean;
}

/** One gameweek squad, from `entry/{id}/event/{gw}/picks/`. */
export interface GameweekPicks {
  /** the gameweek asked for */
  gameweek: number;
  /** active_chip, null when no chip was played */
  chip: string | null;
  picks: Pick[];
}

/** Everything one manager's facts need, slimmed by fpl.ts. */
export interface ManagerData {
  /** the entry id */
  entry: number;
  /** entry/{id}/history/ current[] */
  history: GameweekEntry[];
  /** entry/{id}/history/ chips[] */
  chips: ChipPlay[];
  /** entry/{id}/transfers/ */
  transfers: Transfer[];
  /** entry/{id}/event/{gw}/picks/, one per finished gameweek, oldest first */
  picks: GameweekPicks[];
}

/** Everything shared across the league: the players file, the standings and the per-player points. */
export interface LeagueData {
  leagueId: number;
  leagueName: string;
  /** the gameweek the report is built for */
  gameweek: number;
  /** false while that gameweek is still live */
  gameweekFinished: boolean;
  gameweeks: GameweekInfo[];
  /** keyed by player id */
  players: Record<number, Player>;
  /** keyed by player id, only the players the report needs per-gameweek points for */
  playerPoints: Record<number, PlayerSummary>;
  entries: LeagueEntry[];
}

/** One league in a manager's list, from `entry/{id}/` `leagues.classic[]`. Used by the team page. */
export interface EntryLeague {
  /** leagues.classic[].id */
  id: number;
  /** leagues.classic[].name, capped at 40 characters */
  name: string;
  /** leagues.classic[].entry_rank */
  rank: number | null;
}
