// FPL client: id parsing, the concurrency limiter, retry rules and payload slimming. Fetch is always mocked.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONCURRENCY,
  FplError,
  MAX_ID,
  capName,
  getBootstrap,
  getManager,
  getPlayerSummary,
  getStandings,
  parseId,
} from "../lib/fpl";

/** A fetch stand-in that answers every call with the same JSON body. */
function okWith(body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
}

beforeEach(() => {
  vi.stubGlobal("fetch", okWith({}));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("parseId", () => {
  it("takes a bare number", () => {
    expect(parseId("1500")).toBe(1500);
    expect(parseId("  1500  ")).toBe(1500);
    expect(parseId(1500)).toBe(1500);
  });

  it("takes the number out of a pasted FPL url and nothing else", () => {
    expect(parseId("https://fantasy.premierleague.com/leagues/1500/standings/c")).toBe(1500);
    expect(parseId("https://fantasy.premierleague.com/api/leagues-classic/1500/standings/")).toBe(1500);
    expect(parseId("https://fantasy.premierleague.com/entry/1921782/event/10")).toBe(1921782);
  });

  it("rejects anything that is not a usable id", () => {
    expect(parseId("0")).toBeNull();
    expect(parseId("")).toBeNull();
    expect(parseId("   ")).toBeNull();
    expect(parseId("my league")).toBeNull();
    expect(parseId(null)).toBeNull();
    expect(parseId(undefined)).toBeNull();
    expect(parseId(1.5)).toBeNull();
    expect(parseId(MAX_ID + 1)).toBeNull();
    expect(parseId(String(MAX_ID + 1))).toBeNull();
  });

  it("refuses a bad id before it reaches the network", async () => {
    const fetchMock = okWith({});
    vi.stubGlobal("fetch", fetchMock);
    await expect(getStandings(0)).rejects.toBeInstanceOf(FplError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("capName", () => {
  it("caps at 40 characters and flattens control characters", () => {
    expect(capName("a".repeat(60))).toHaveLength(40);
    expect(capName("Sam\nKing")).toBe("Sam King");
    expect(capName(undefined)).toBe("");
  });
});

describe("limiter", () => {
  it("never has more than four requests in flight", async () => {
    let live = 0;
    let peak = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        live++;
        peak = Math.max(peak, live);
        await new Promise((resolve) => setTimeout(resolve, 5));
        live--;
        return new Response(JSON.stringify({ history: [] }), { status: 200 });
      }),
    );
    await Promise.all(Array.from({ length: 20 }, (_, i) => getPlayerSummary(i + 1)));
    expect(peak).toBe(CONCURRENCY);
  });
});

describe("retry", () => {
  it("retries a 429 and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("slow down", { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ history: [{ round: 1, total_points: 7 }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    const pending = getPlayerSummary(1);
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(pending).resolves.toEqual({ id: 1, points: { 1: 7 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a 500 and gives up after the last attempt", async () => {
    const fetchMock = vi.fn(async () => new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    const pending = getPlayerSummary(1).catch((error: FplError) => error);
    await vi.advanceTimersByTimeAsync(30_000);

    const error = (await pending) as FplError;
    expect(error).toBeInstanceOf(FplError);
    expect(error.status).toBe(500);
    expect(error.notFound).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("never retries a 404", async () => {
    const fetchMock = vi.fn(async () => new Response("gone", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getStandings(1500)).rejects.toMatchObject({ notFound: true, status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never retries another 4xx", async () => {
    const fetchMock = vi.fn(async () => new Response("no", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getStandings(1500)).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("slimming", () => {
  it("keeps only the bootstrap fields the facts use", async () => {
    vi.stubGlobal(
      "fetch",
      okWith({
        events: [
          { id: 1, finished: true, deadline_time: "2026-08-14T17:30:00Z", top_element: 5, is_current: false, is_next: false },
          { id: 2, finished: false, deadline_time: "2026-08-21T17:30:00Z", top_element: null, is_current: true, is_next: false },
          { id: 3, finished: false, deadline_time: "2026-08-28T17:30:00Z", top_element: null, is_current: false, is_next: true },
        ],
        teams: [{ id: 7, short_name: "LIV" }],
        elements: [
          {
            id: 5,
            web_name: "Salah",
            element_type: 3,
            team: 7,
            selected_by_percent: "42.1",
            total_points: 61,
            minutes: 900,
            news: "ignored",
          },
        ],
      }),
    );

    const bootstrap = await getBootstrap();

    expect(bootstrap.currentGameweek).toBe(2);
    expect(bootstrap.currentFinished).toBe(false);
    expect(bootstrap.nextDeadline).toBe("2026-08-28T17:30:00Z");
    expect(bootstrap.gameweeks).toHaveLength(3);
    expect(bootstrap.players[5]).toEqual({
      id: 5,
      name: "Salah",
      position: 3,
      team: "LIV",
      ownership: 42.1,
      totalPoints: 61,
    });
  });

  it("takes the first twenty managers only and caps names", async () => {
    const results = Array.from({ length: 50 }, (_, i) => ({
      entry: i + 1,
      player_name: "N".repeat(60),
      entry_name: `Team ${i + 1}`,
      rank: i + 1,
      last_rank: i + 2,
      total: 500 - i,
      club_badge_src: "ignored",
    }));
    vi.stubGlobal("fetch", okWith({ league: { id: 1500, name: "Cornwall Champions" }, standings: { results } }));

    const standings = await getStandings(1500);

    expect(standings.entries).toHaveLength(20);
    expect(standings.entries[0]).toEqual({
      entry: 1,
      name: "N".repeat(40),
      teamName: "Team 1",
      rank: 1,
      lastRank: 2,
      totalPoints: 500,
    });
  });

  it("builds one manager from history, transfers and a picks call per played gameweek", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/history/")) {
        return new Response(
          JSON.stringify({
            current: [
              {
                event: 1,
                points: 60,
                total_points: 60,
                overall_rank: 900_000,
                points_on_bench: 8,
                event_transfers: 0,
                event_transfers_cost: 0,
                bank: 5,
              },
              {
                event: 2,
                points: 40,
                total_points: 100,
                overall_rank: 1_200_000,
                points_on_bench: 14,
                event_transfers: 2,
                event_transfers_cost: 4,
                bank: 2,
              },
              // A gameweek past the one asked for; it must be dropped.
              { event: 3, points: 70, total_points: 170, overall_rank: 800_000, points_on_bench: 0, event_transfers: 0, event_transfers_cost: 0 },
            ],
            chips: [
              { name: "wildcard", event: 2 },
              { name: "bboost", event: 3 },
            ],
            past: [],
          }),
          { status: 200 },
        );
      }
      if (url.endsWith("/transfers/")) {
        return new Response(
          JSON.stringify([
            { event: 2, element_in: 5, element_out: 9, element_in_cost: 130 },
            { event: 3, element_in: 11, element_out: 12 },
          ]),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          active_chip: null,
          automatic_subs: [],
          entry_history: {},
          picks: [{ element: 5, position: 1, multiplier: 2, is_captain: true, is_vice_captain: false }],
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const manager = await getManager(1921782, 2);

    expect(manager.entry).toBe(1921782);
    expect(manager.history.map((row) => row.gameweek)).toEqual([1, 2]);
    expect(manager.history[1]).toEqual({
      gameweek: 2,
      points: 40,
      totalPoints: 100,
      overallRank: 1_200_000,
      benchPoints: 14,
      transfers: 2,
      transferCost: 4,
    });
    expect(manager.chips).toEqual([{ name: "wildcard", gameweek: 2 }]);
    expect(manager.transfers).toEqual([{ gameweek: 2, playerIn: 5, playerOut: 9 }]);
    expect(manager.picks).toHaveLength(2);
    expect(manager.picks[0]).toEqual({
      gameweek: 1,
      chip: null,
      picks: [{ player: 5, slot: 1, multiplier: 2, isCaptain: true }],
    });
    // history, transfers, and one picks call per played gameweek.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("sums a double gameweek into one player-summary entry", async () => {
    vi.stubGlobal(
      "fetch",
      okWith({
        history: [
          { round: 1, total_points: 6, minutes: 90 },
          { round: 2, total_points: 2, minutes: 90 },
          { round: 2, total_points: 9, minutes: 90 },
        ],
      }),
    );

    await expect(getPlayerSummary(5)).resolves.toEqual({ id: 5, points: { 1: 6, 2: 11 } });
  });
});
