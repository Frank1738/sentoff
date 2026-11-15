// FPL client: limiter (concurrency 4), retry with backoff on 429 and 5xx only, slim payloads. 404 is final.
import type {
  Bootstrap,
  ChipPlay,
  EntryLeague,
  GameweekEntry,
  GameweekInfo,
  GameweekPicks,
  LeagueEntry,
  ManagerData,
  Pick,
  Player,
  PlayerSummary,
  Standings,
  Transfer,
} from "./types";

const BASE = "https://fantasy.premierleague.com/api";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Concurrency cap across every call this module makes. */
export const CONCURRENCY = 4;
/** Extra attempts after the first, for 429 and 5xx only. */
export const RETRIES = 3;
const BACKOFF_MS = 500;

/** Highest id we will ask the FPL API for. Bigger means a typo, not a league. */
export const MAX_ID = 99_999_999;
/** Names from the API are hostile input; nothing downstream sees more than this many characters. */
export const MAX_NAME = 40;
/** First standings page only, and only this many managers from it. */
export const MAX_MANAGERS = 20;

/** Any FPL call that did not come back with usable JSON. `notFound` is a 404: never retried, never cached as a report. */
export class FplError extends Error {
  readonly status: number;
  readonly notFound: boolean;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FplError";
    this.status = status;
    this.notFound = status === 404;
  }
}

/**
 * Pulls a league, team or entry id out of user input: a bare number or a pasted FPL URL.
 * Returns null for anything else. Only the number is kept; no URL is ever built from user text.
 */
export function parseId(input: string | number | null | undefined): number | null {
  if (typeof input === "number") return validId(input);
  if (typeof input !== "string") return null;
  const text = input.trim();
  if (text === "") return null;
  if (/^\d+$/.test(text)) return validId(Number(text));
  // A pasted URL: the number after leagues, entry or team, else the first number anywhere.
  const labelled = text.match(/(?:leagues?|entry|team)\D{0,12}?(\d+)/i);
  if (labelled) return validId(Number(labelled[1]));
  const anyNumber = text.match(/\d+/);
  return anyNumber ? validId(Number(anyNumber[0])) : null;
}

function validId(n: number): number | null {
  if (!Number.isInteger(n) || n < 1 || n > MAX_ID) return null;
  return n;
}

/** Caps a name from the API at 40 characters and flattens control characters. */
export function capName(name: unknown): string {
  if (typeof name !== "string") return "";
  let out = "";
  for (const char of name) {
    const code = char.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f ? " " : char;
  }
  return out.trim().slice(0, MAX_NAME);
}

// --- limiter ---------------------------------------------------------------

let inFlight = 0;
const waiting: Array<() => void> = [];

async function withLimit<T>(run: () => Promise<T>): Promise<T> {
  if (inFlight >= CONCURRENCY) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  inFlight++;
  try {
    return await run();
  } finally {
    inFlight--;
    waiting.shift()?.();
  }
}

/**
 * Starts every task together and keeps the results in input order. The limiter sits on the
 * HTTP call itself, not here, so a task that makes several calls cannot deadlock waiting on itself.
 */
export async function all<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
  return Promise.all(tasks.map((task) => task()));
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** GETs one FPL path through the limiter. Retries 429 and 5xx with backoff; 404 throws straight away. */
async function get<T>(path: string): Promise<T> {
  return withLimit(async () => {
    let lastError = new FplError(`${path} failed`, 0);
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      if (attempt > 0) await sleep(BACKOFF_MS * 2 ** (attempt - 1));
      let response: Response;
      try {
        response = await fetch(`${BASE}${path}`, {
          headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
          cache: "no-store",
        });
      } catch (error) {
        lastError = new FplError(`${path} unreachable: ${(error as Error).message}`, 0);
        continue;
      }
      if (response.ok) return (await response.json()) as T;
      if (response.status === 404) throw new FplError(`${path} not found`, 404);
      if (response.status === 429 || response.status >= 500) {
        lastError = new FplError(`${path} returned ${response.status}`, response.status);
        continue;
      }
      throw new FplError(`${path} returned ${response.status}`, response.status);
    }
    throw lastError;
  });
}

// --- calls -----------------------------------------------------------------

/** The players file, slimmed to the fields the facts use. The raw file is 1.8 MB, so only the slimmed shape is ever cached. */
export async function getBootstrap(): Promise<Bootstrap> {
  const raw = await get<RawBootstrap>("/bootstrap-static/");
  const teamNames = new Map(raw.teams.map((team) => [team.id, team.short_name]));
  const players: Record<number, Player> = {};
  for (const element of raw.elements) {
    players[element.id] = {
      id: element.id,
      name: capName(element.web_name),
      position: element.element_type,
      team: teamNames.get(element.team) ?? "",
      ownership: Number(element.selected_by_percent) || 0,
      totalPoints: element.total_points,
    };
  }
  const gameweeks: GameweekInfo[] = raw.events.map((event) => ({
    id: event.id,
    finished: event.finished,
    deadline: event.deadline_time,
    topPlayer: event.top_element ?? null,
  }));
  const current = raw.events.find((event) => event.is_current);
  const next = raw.events.find((event) => event.is_next);
  return {
    currentGameweek: current?.id ?? 1,
    currentFinished: current?.finished ?? false,
    nextDeadline: next?.deadline_time ?? null,
    gameweeks,
    players,
  };
}

/** First standings page only, capped at 20 managers. */
export async function getStandings(leagueId: number): Promise<Standings> {
  const id = validId(leagueId);
  if (id === null) throw new FplError("bad league id", 400);
  const raw = await get<RawStandings>(`/leagues-classic/${id}/standings/`);
  const entries: LeagueEntry[] = raw.standings.results.slice(0, MAX_MANAGERS).map((row) => ({
    entry: row.entry,
    name: capName(row.player_name),
    teamName: capName(row.entry_name),
    rank: row.rank,
    lastRank: row.last_rank,
    totalPoints: row.total,
  }));
  return { leagueId: id, leagueName: capName(raw.league.name), entries };
}

/** History, transfers and one picks call per played gameweek, for one manager. */
export async function getManager(entry: number, gameweek: number): Promise<ManagerData> {
  const id = validId(entry);
  if (id === null) throw new FplError("bad entry id", 400);
  const gw = Math.max(1, Math.min(38, Math.trunc(gameweek)));
  const [history, transfers] = await Promise.all([
    get<RawHistory>(`/entry/${id}/history/`),
    get<RawTransfer[]>(`/entry/${id}/transfers/`),
  ]);
  const played = history.current.filter((row) => row.event <= gw);
  const picks = await all(played.map((row) => () => getPicks(id, row.event)));
  return {
    entry: id,
    history: played.map(
      (row): GameweekEntry => ({
        gameweek: row.event,
        points: row.points,
        totalPoints: row.total_points,
        overallRank: row.overall_rank,
        benchPoints: row.points_on_bench,
        transfers: row.event_transfers,
        transferCost: row.event_transfers_cost,
      }),
    ),
    chips: history.chips
      .filter((chip) => chip.event <= gw)
      .map((chip): ChipPlay => ({ name: chip.name, gameweek: chip.event })),
    transfers: transfers
      .filter((transfer) => transfer.event <= gw)
      .map(
        (transfer): Transfer => ({
          gameweek: transfer.event,
          playerIn: transfer.element_in,
          playerOut: transfer.element_out,
        }),
      ),
    picks,
  };
}

/** One gameweek squad for one manager. */
async function getPicks(entry: number, gameweek: number): Promise<GameweekPicks> {
  const raw = await get<RawPicks>(`/entry/${entry}/event/${gameweek}/picks/`);
  return {
    gameweek,
    chip: raw.active_chip ?? null,
    picks: raw.picks.map(
      (pick): Pick => ({
        player: pick.element,
        slot: pick.position,
        multiplier: pick.multiplier,
        isCaptain: pick.is_captain,
      }),
    ),
  };
}

/** One player's points per gameweek, summed so a double gameweek lands on one key. */
export async function getPlayerSummary(playerId: number): Promise<PlayerSummary> {
  const id = validId(playerId);
  if (id === null) throw new FplError("bad player id", 400);
  const raw = await get<RawElementSummary>(`/element-summary/${id}/`);
  const points: Record<number, number> = {};
  for (const row of raw.history) {
    points[row.round] = (points[row.round] ?? 0) + row.total_points;
  }
  return { id, points };
}

/** The classic leagues one manager is in, for the team page. Capped at 20. */
export async function getEntryLeagues(entry: number): Promise<EntryLeague[]> {
  const id = validId(entry);
  if (id === null) throw new FplError("bad entry id", 400);
  const raw = await get<RawEntry>(`/entry/${id}/`);
  return raw.leagues.classic.slice(0, MAX_MANAGERS).map((league) => ({
    id: league.id,
    name: capName(league.name),
    rank: league.entry_rank ?? null,
  }));
}

// --- raw payload shapes, only the fields read above -------------------------

interface RawBootstrap {
  events: Array<{
    id: number;
    finished: boolean;
    deadline_time: string;
    top_element: number | null;
    is_current: boolean;
    is_next: boolean;
  }>;
  teams: Array<{ id: number; short_name: string }>;
  elements: Array<{
    id: number;
    web_name: string;
    element_type: number;
    team: number;
    selected_by_percent: string;
    total_points: number;
  }>;
}

interface RawStandings {
  league: { id: number; name: string };
  standings: {
    results: Array<{
      entry: number;
      player_name: string;
      entry_name: string;
      rank: number;
      last_rank: number;
      total: number;
    }>;
  };
}

interface RawHistory {
  current: Array<{
    event: number;
    points: number;
    total_points: number;
    overall_rank: number;
    points_on_bench: number;
    event_transfers: number;
    event_transfers_cost: number;
  }>;
  chips: Array<{ name: string; event: number }>;
}

interface RawTransfer {
  event: number;
  element_in: number;
  element_out: number;
}

interface RawPicks {
  active_chip: string | null;
  picks: Array<{ element: number; position: number; multiplier: number; is_captain: boolean }>;
}

interface RawElementSummary {
  history: Array<{ round: number; total_points: number }>;
}

interface RawEntry {
  leagues: { classic: Array<{ id: number; name: string; entry_rank: number | null }> };
}
