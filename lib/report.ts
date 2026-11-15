// Runs the pipeline in order: standings, manager fetches with progress, facts ranked, cards as each writer call finishes.
import { cacheLife } from "next/cache";
import { computeLeague } from "./facts";
import {
  FplError,
  MAX_MANAGERS,
  getBootstrap,
  getManager,
  getPlayerSummary,
  getStandings,
} from "./fpl";
import {
  CLAUDE_WINDOW_SECONDS,
  GLOBAL_BUILD_WINDOW_SECONDS,
  IP_LIMIT,
  IP_WINDOW_SECONDS,
  LIVE_TTL_SECONDS,
  bumpCounter,
  claudeKey,
  getReport,
  globalBuildKey,
  ipRateKey,
  isBlocked,
  saveReport,
} from "./redis";
import { templateRoast } from "./templates";
import type {
  Bootstrap,
  LeagueData,
  LeagueEntry,
  Manager,
  ManagerData,
  PlayerSummary,
  Report,
} from "./types";
import { hasWriter, writeRoast } from "./writer";

/** Cold builds everyone together may start in an hour, so our IP never looks like a scraper to FPL. */
export const GLOBAL_BUILD_CAP = 60;
/** Writer calls a day across all users. Past it, every roast is a template line and the app stays up. */
export const CLAUDE_DAILY_CAP = 2_000;
/** Writer calls running at once. The FPL limiter is separate and has already finished by this point. */
const WRITER_CONCURRENCY = 4;
/** How long a known-missing league is remembered, so a typo cannot cost a 404 every reload. */
const NOT_FOUND_TTL_MS = 60_000;
/** What a blocklisted entry's card says instead of a roast. */
export const OPTED_OUT_ROAST = "This manager has opted out. No roast on file.";

/** One step of a build, as the stream reports it. Every step carries the same `done` of `total`. */
export type Progress =
  | {
      phase: "standings";
      done: number;
      total: number;
      leagueName: string;
      gameweek: number;
      standings: LeagueEntry[];
    }
  | { phase: "reading"; done: number; total: number }
  | { phase: "card"; done: number; total: number; manager: Manager };

/**
 * Leagues FPL has told us do not exist, with the time the answer goes stale. Per instance on
 * purpose: it exists to stop one typo costing a 404 per reload, and the rate limits do the rest.
 */
const missing = new Map<number, number>();

function knownMissing(leagueId: number): boolean {
  const until = missing.get(leagueId);
  if (until === undefined) return false;
  if (until <= Date.now()) {
    missing.delete(leagueId);
    return false;
  }
  return true;
}

/**
 * The slimmed players file and gameweek table, held for an hour. Every warm page view needs the
 * current gameweek to build the cache key, and the raw file is 1.8 MB, so it is never re-fetched
 * per request.
 */
async function bootstrap(): Promise<Bootstrap> {
  "use cache";
  cacheLife("hours");
  return getBootstrap();
}

/** The gameweek a report is built for, plus whether its matches have all been played. */
export async function currentGameweek(): Promise<{
  gameweek: number;
  finished: boolean;
  nextDeadline: string | null;
}> {
  const data = await bootstrap();
  return {
    gameweek: data.currentGameweek,
    finished: data.currentFinished,
    nextDeadline: data.nextDeadline,
  };
}

/** The finished report for this league and gameweek if one is cached, else null. Never builds. */
export async function cachedReport(leagueId: number): Promise<Report | null> {
  try {
    const { gameweek } = await currentGameweek();
    return await getReport(leagueId, gameweek);
  } catch {
    return null;
  }
}

/** Why a cold build was refused, or "ok". Cached reports never reach this function. */
export type LimitResult = "ok" | "ip" | "global";

/** Counts one cold build against the per-IP and global windows. The IP is hashed inside redis.ts. */
export async function takeBuildSlot(ip: string | null): Promise<LimitResult> {
  if (ip) {
    const perIp = await bumpCounter(ipRateKey(ip), IP_WINDOW_SECONDS);
    if (perIp > IP_LIMIT) return "ip";
  }
  const global = await bumpCounter(globalBuildKey, GLOBAL_BUILD_WINDOW_SECONDS);
  return global > GLOBAL_BUILD_CAP ? "global" : "ok";
}

/**
 * Builds one league report and saves it. Progress is reported in the three phases the page
 * renders: the standings strip, the read counter, then one card per writer call as it lands.
 * Throws `FplError` and caches nothing when the build fails.
 */
export async function buildReport(
  leagueId: number,
  onProgress?: (progress: Progress) => void,
): Promise<Report> {
  if (knownMissing(leagueId)) throw new FplError(`league ${leagueId} not found`, 404);

  // One bootstrap read for the whole build: the gameweek, the players file and the deadlines.
  const data = await bootstrap();
  const gameweek = data.currentGameweek;
  const finished = data.currentFinished;
  const nextDeadline = data.nextDeadline;

  let standings: Awaited<ReturnType<typeof getStandings>>;
  try {
    standings = await getStandings(leagueId);
  } catch (error) {
    if (error instanceof FplError && error.notFound) {
      missing.set(leagueId, Date.now() + NOT_FOUND_TTL_MS);
    }
    throw error;
  }
  if (standings.entries.length === 0) {
    missing.set(leagueId, Date.now() + NOT_FOUND_TTL_MS);
    throw new FplError(`league ${leagueId} has no managers`, 404);
  }

  const total = Math.min(standings.entries.length, MAX_MANAGERS);
  onProgress?.({
    phase: "standings",
    done: 0,
    total,
    leagueName: standings.leagueName,
    gameweek,
    standings: standings.entries,
  });

  let read = 0;
  const managerData = await Promise.all(
    standings.entries.map(async (entry): Promise<ManagerData> => {
      const data = await getManager(entry.entry, gameweek);
      read++;
      onProgress?.({ phase: "reading", done: read, total });
      return data;
    }),
  );

  const playerPoints = await fetchPlayerPoints(managerData, data.gameweeks);
  const league: LeagueData = {
    leagueId: standings.leagueId,
    leagueName: standings.leagueName,
    gameweek,
    gameweekFinished: finished,
    gameweeks: data.gameweeks,
    players: data.players,
    playerPoints,
    entries: standings.entries,
  };

  const { managers, awards } = computeLeague(league, managerData);
  const roasted = await roastAll(managers, (manager, done) =>
    onProgress?.({ phase: "card", done, total, manager }),
  );

  const report: Report = {
    leagueId: league.leagueId,
    leagueName: league.leagueName,
    gameweek,
    builtAt: new Date().toISOString(),
    managers: roasted,
    awards,
  };
  await saveReport(report, reportTtl(finished, nextDeadline));
  return report;
}

/**
 * How long this report is good for: an hour while the gameweek is still being played, otherwise
 * up to the next deadline, because nothing in it can change until then. saveReport caps at 3 days.
 */
export function reportTtl(gameweekFinished: boolean, nextDeadline: string | null): number {
  if (!gameweekFinished) return LIVE_TTL_SECONDS;
  if (nextDeadline === null) return LIVE_TTL_SECONDS;
  const seconds = Math.floor((Date.parse(nextDeadline) - Date.now()) / 1000);
  return Number.isFinite(seconds) && seconds > 60 ? seconds : LIVE_TTL_SECONDS;
}

/**
 * Every player the facts need per-gameweek points for: both ends of each transfer, every
 * captain, and the starters in a chip week. One `element-summary` call per unique player.
 */
async function fetchPlayerPoints(
  managers: ManagerData[],
  gameweeks: LeagueData["gameweeks"],
): Promise<Record<number, PlayerSummary>> {
  const ids = new Set<number>();
  for (const manager of managers) {
    for (const transfer of manager.transfers) {
      ids.add(transfer.playerIn);
      ids.add(transfer.playerOut);
    }
    const chipWeeks = new Set(manager.chips.map((chip) => chip.gameweek));
    for (const squad of manager.picks) {
      for (const pick of squad.picks) {
        if (pick.isCaptain) ids.add(pick.player);
        else if (chipWeeks.has(squad.gameweek) && pick.multiplier > 0) ids.add(pick.player);
      }
    }
  }
  for (const week of gameweeks) {
    if (week.topPlayer !== null) ids.add(week.topPlayer);
  }

  const points: Record<number, PlayerSummary> = {};
  const summaries = await Promise.all(
    [...ids].map(async (id) => {
      try {
        return await getPlayerSummary(id);
      } catch {
        // One missing player costs that player's facts, not the whole league.
        return { id, points: {} } satisfies PlayerSummary;
      }
    }),
  );
  for (const summary of summaries) points[summary.id] = summary;
  return points;
}

/**
 * Fills in every roast, four at a time, calling back as each lands so cards can stream.
 * Blocklisted entries never reach the writer. Past the daily Claude cap, everyone gets a template.
 */
async function roastAll(
  managers: Manager[],
  onCard: (manager: Manager, done: number) => void,
): Promise<Manager[]> {
  const filled: Manager[] = new Array(managers.length);
  let next = 0;
  let done = 0;

  const worker = async (): Promise<void> => {
    while (next < managers.length) {
      const index = next++;
      const manager = managers[index];
      if (!manager) continue;
      filled[index] = await roastOne(manager);
      done++;
      onCard(filled[index], done);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(WRITER_CONCURRENCY, managers.length) }, () => worker()),
  );
  return filled;
}

/** One manager's roast: the opted-out line, a template past the cap, or the writer. */
async function roastOne(manager: Manager): Promise<Manager> {
  if (await isBlocked(manager.entry)) {
    return { ...manager, optedOut: true, roast: OPTED_OUT_ROAST };
  }
  // With no key the writer returns a template without calling out, so the cap is not spent on it.
  if (!hasWriter()) {
    return { ...manager, roast: templateRoast(manager.facts) };
  }
  const calls = await bumpCounter(claudeKey, CLAUDE_WINDOW_SECONDS);
  if (calls > CLAUDE_DAILY_CAP) {
    return { ...manager, roast: templateRoast(manager.facts) };
  }
  return { ...manager, roast: await writeRoast(manager, manager.facts) };
}
