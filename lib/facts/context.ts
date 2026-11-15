// Shared ground for every rule: the league payload, the per-gameweek league low, and the sting scale.
import type { GameweekPicks, LeagueData, ManagerData } from "../types";

/** Everything a rule may read beyond the one manager it is scoring. */
export interface FactContext {
  league: LeagueData;
  /** the lowest score anyone in the league posted, keyed by gameweek */
  lowestByGameweek: Record<number, number>;
}

/**
 * Collects what the rules need beyond one manager's own data: the league payload and the
 * lowest score anyone in the league posted in each gameweek (cucumber needs the whole table).
 */
export function buildContext(league: LeagueData, managers: ManagerData[]): FactContext {
  const lowestByGameweek: Record<number, number> = {};
  for (const manager of managers) {
    for (const row of manager.history) {
      const low = lowestByGameweek[row.gameweek];
      if (low === undefined || row.points < low) lowestByGameweek[row.gameweek] = row.points;
    }
  }
  return { league, lowestByGameweek };
}

/**
 * 0 at `floor` or below, 100 at `ceiling` or above, a straight line between.
 * Every rule picks a floor that puts the spec's "sting rises when" threshold at 50.
 */
export function scale(value: number, floor: number, ceiling: number): number {
  if (!Number.isFinite(value) || value <= floor) return 0;
  if (value >= ceiling) return 100;
  return Math.round(((value - floor) / (ceiling - floor)) * 100);
}

/** Display name for a player id, from the slimmed players file. Already capped at 40 characters there. */
export function playerName(context: FactContext, id: number): string {
  return context.league.players[id]?.name || `player ${id}`;
}

/** What a player scored in one gameweek, before any captain multiplier. 0 when we did not fetch him. */
export function playerPoints(context: FactContext, id: number, gameweek: number): number {
  return context.league.playerPoints[id]?.points[gameweek] ?? 0;
}

/** The captain's element id in one gameweek squad, null if the picks never named one. */
export function captainOf(squad: GameweekPicks): number | null {
  return squad.picks.find((pick) => pick.isCaptain)?.player ?? null;
}

/** Gameweek squads oldest first, so streak rules can walk them in order. */
export function squadsInOrder(manager: ManagerData): GameweekPicks[] {
  return [...manager.picks].sort((a, b) => a.gameweek - b.gameweek);
}

/** Gameweek history rows oldest first. */
export function historyInOrder(manager: ManagerData) {
  return [...manager.history].sort((a, b) => a.gameweek - b.gameweek);
}
