// Facts engine: a snapshot over the real league fixture, plus one hand-built case per rule at its sting threshold.
import { describe, expect, it } from "vitest";
import { benchBurner } from "../lib/facts/bench_burner";
import { capBlank } from "../lib/facts/cap_blank";
import { chipPanic } from "../lib/facts/chip_panic";
import { type FactContext, buildContext } from "../lib/facts/context";
import { cucumber } from "../lib/facts/cucumber";
import { deadWood } from "../lib/facts/dead_wood";
import { hitMan } from "../lib/facts/hit_man";
import { RULES, computeFacts, computeLeague, rankSting } from "../lib/facts/index";
import { loyaltyCard } from "../lib/facts/loyalty_card";
import { redArrows } from "../lib/facts/red_arrows";
import { serialChaser } from "../lib/facts/serial_chaser";
import { sheepIndex } from "../lib/facts/sheep_index";
import { theCurse } from "../lib/facts/the_curse";
import type {
  ChipPlay,
  Fact,
  GameweekEntry,
  GameweekPicks,
  LeagueData,
  ManagerData,
  Transfer,
} from "../lib/types";
import fixture from "./fixtures/league.json";

// League 1500 "Cornwall Champions", gameweek 10, captured 15 Nov 2026.
const league = fixture.league as LeagueData;
const managers = fixture.managers as ManagerData[];

/** The threshold each rule's spec row names, so a hand-built case that hits it scores at least this. */
const THRESHOLD_STING = 50;

describe("the fixture", () => {
  it("is the league the snapshot was taken from", () => {
    expect(league.leagueId).toBe(1500);
    expect(league.gameweek).toBe(10);
    expect(managers).toHaveLength(20);
  });
});

describe("computeFacts over the fixture", () => {
  const context = buildContext(league, managers);

  it("returns every rule once for every manager, all stings in range", () => {
    for (const manager of managers) {
      const facts = computeFacts(manager, context);
      expect(facts).toHaveLength(RULES.length);
      expect(new Set(facts.map((fact) => fact.key)).size).toBe(RULES.length);
      for (const fact of facts) {
        expect(fact.sting).toBeGreaterThanOrEqual(0);
        expect(fact.sting).toBeLessThanOrEqual(100);
      }
    }
  });

  it("matches the snapshot", () => {
    const all: Record<number, Fact[]> = {};
    for (const manager of managers) all[manager.entry] = computeFacts(manager, context);
    expect(all).toMatchSnapshot();
  });
});

describe("rankSting", () => {
  it("adds the biggest bonus to the league worst and a smaller one to the runner-up", () => {
    const only = (value: number, sting: number): Fact[] => [
      { key: "bench_burner", headline: "x", value, sting },
    ];
    const ranked = rankSting(
      new Map([
        [1, only(40, 50)],
        [2, only(20, 25)],
        [3, only(10, 12)],
      ]),
    );
    expect(ranked.get(1)?.[0].sting).toBe(70);
    expect(ranked.get(2)?.[0].sting).toBe(35);
    expect(ranked.get(3)?.[0].sting).toBe(12);
  });

  it("leaves facts nobody triggered alone and never mutates the input", () => {
    const input = new Map<number, Fact[]>([
      [1, [{ key: "cucumber", headline: "x", value: 0, sting: 0 }]],
    ]);
    const ranked = rankSting(input);
    expect(ranked.get(1)?.[0].sting).toBe(0);
    expect(input.get(1)?.[0].sting).toBe(0);
  });

  it("never pushes sting past 100", () => {
    const ranked = rankSting(
      new Map<number, Fact[]>([[1, [{ key: "cucumber", headline: "x", value: 4, sting: 95 }]]]),
    );
    expect(ranked.get(1)?.[0].sting).toBe(100);
  });
});

describe("computeLeague over the fixture", () => {
  const { managers: cards, awards } = computeLeague(league, managers);

  it("builds one card per standings row, in rank order", () => {
    expect(cards).toHaveLength(league.entries.length);
    const ranks = cards.map((card) => card.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("caps names at 40 characters and leaves the roast for the writer", () => {
    for (const card of cards) {
      expect(card.name.length).toBeLessThanOrEqual(40);
      expect(card.teamName.length).toBeLessThanOrEqual(40);
      expect(card.roast).toBe("");
      expect(card.optedOut).toBe(false);
    }
  });

  it("gives each manager an archetype and up to three facts, hardest first", () => {
    for (const card of cards) {
      expect(card.facts.length).toBeGreaterThan(0);
      expect(card.facts.length).toBeLessThanOrEqual(3);
      expect(card.facts[0].sting).toBeGreaterThanOrEqual(card.facts[card.facts.length - 1].sting);
      expect(card.archetype).toBeTruthy();
    }
  });

  it("hands out the four awards to managers in the league", () => {
    expect(awards.map((award) => award.title)).toEqual([
      "Golden Boot of Shame",
      "Red Card",
      "Benchwarmer of the Year",
      "Wooden Spoon",
    ]);
    const entries = new Set(cards.map((card) => card.entry));
    for (const award of awards) expect(entries.has(award.entry)).toBe(true);
  });

  it("gives the wooden spoon to last place", () => {
    const spoon = awards.find((award) => award.title === "Wooden Spoon");
    const last = [...cards].sort((a, b) => b.rank - a.rank)[0];
    expect(spoon?.entry).toBe(last.entry);
  });

  it("matches the snapshot", () => {
    expect({ managers: cards, awards }).toMatchSnapshot();
  });
});

// --- hand-built cases, one per rule at its threshold -------------------------

/** An empty manager, so each case below fills only the fields its rule reads. */
function manager(parts: Partial<ManagerData> = {}): ManagerData {
  return { entry: 1, history: [], chips: [], transfers: [], picks: [], ...parts };
}

function week(gameweek: number, parts: Partial<GameweekEntry> = {}): GameweekEntry {
  return {
    gameweek,
    points: 50,
    totalPoints: 50 * gameweek,
    overallRank: 100_000,
    benchPoints: 0,
    transfers: 0,
    transferCost: 0,
    ...parts,
  };
}

/** A squad of one captain plus fillers, which is all any rule here reads. */
function squad(
  gameweek: number,
  captain: number,
  rest: number[] = [],
  chip: string | null = null,
): GameweekPicks {
  return {
    gameweek,
    chip,
    picks: [
      { player: captain, slot: 1, multiplier: chip === "3xc" ? 3 : 2, isCaptain: true },
      ...rest.map((player, index) => ({
        player,
        slot: index + 2,
        multiplier: 1,
        isCaptain: false,
      })),
    ],
  };
}

/** A bench-boost squad: one starter plus a single bench player, in a real bench slot. */
function bench(gameweek: number, benchPlayer: number): GameweekPicks {
  return {
    gameweek,
    chip: "bboost",
    picks: [
      { player: 1, slot: 1, multiplier: 2, isCaptain: true },
      { player: benchPlayer, slot: 12, multiplier: 1, isCaptain: false },
    ],
  };
}

function context(
  parts: Partial<LeagueData> = {},
  lowestByGameweek: Record<number, number> = {},
): FactContext {
  return {
    league: {
      leagueId: 1,
      leagueName: "Test",
      gameweek: 10,
      gameweekFinished: true,
      gameweeks: [],
      players: {},
      playerPoints: {},
      entries: [],
      ...parts,
    },
    lowestByGameweek,
  };
}

/** Points for one player, keyed by gameweek, in the shape the context expects. */
function points(id: number, byGameweek: Record<number, number>) {
  return { [id]: { id, points: byGameweek } };
}

function player(id: number, name: string, ownership = 0) {
  return { [id]: { id, name, position: 3, team: "ARS", ownership, totalPoints: 0 } };
}

describe("each rule at its threshold", () => {
  it("bench_burner stings on a big bench pile", () => {
    const fact = benchBurner(
      manager({ history: [week(1, { benchPoints: 40 }), week(2, { benchPoints: 40 })] }),
      context(),
    );
    expect(fact.value).toBe(80);
    expect(fact.sting).toBe(100);
    expect(fact.headline).toContain("80 points left on the bench");
  });

  it("loyalty_card stings at a five-gameweek captain streak", () => {
    const picks = [1, 2, 3, 4, 5].map((gw) => squad(gw, 99));
    const fact = loyaltyCard(manager({ picks }), context({ players: player(99, "Haaland") }));
    expect(fact.value).toBe(5);
    expect(fact.sting).toBeGreaterThanOrEqual(THRESHOLD_STING);
    expect(fact.headline).toContain("Haaland");
  });

  it("hit_man stings when the player brought in for a hit blanks", () => {
    const fact = hitMan(
      manager({
        history: [week(5, { transferCost: 4 })],
        transfers: [{ gameweek: 5, playerIn: 7, playerOut: 8 }],
      }),
      context({ players: player(7, "Mbeumo"), playerPoints: points(7, { 5: 1 }) }),
    );
    expect(fact.value).toBe(4);
    expect(fact.sting).toBeGreaterThanOrEqual(THRESHOLD_STING);
    expect(fact.headline).toContain("Mbeumo");
  });

  it("the_curse stings at 20 points from a sold player", () => {
    const fact = theCurse(
      manager({ transfers: [{ gameweek: 5, playerIn: 7, playerOut: 8 }] }),
      context({ players: player(8, "Salah"), playerPoints: points(8, { 5: 7, 6: 7, 7: 6, 8: 20 }) }),
    );
    expect(fact.value).toBe(20);
    expect(fact.sting).toBeGreaterThanOrEqual(THRESHOLD_STING);
    expect(fact.headline).toContain("Salah");
  });

  it("red_arrows stings at three drops in a row", () => {
    const history = [100, 200, 300, 400].map((overallRank, index) =>
      week(index + 1, { overallRank }),
    );
    const fact = redArrows(manager({ history }), context());
    expect(fact.value).toBe(3);
    expect(fact.sting).toBeGreaterThanOrEqual(THRESHOLD_STING);
  });

  it("cucumber stings at two league-worst gameweeks", () => {
    const fact = cucumber(
      manager({
        history: [week(1, { points: 20 }), week(2, { points: 25 }), week(3, { points: 60 })],
      }),
      context({}, { 1: 20, 2: 25, 3: 40 }),
    );
    expect(fact.value).toBe(2);
    expect(fact.sting).toBeGreaterThanOrEqual(THRESHOLD_STING);
    expect(fact.headline).toContain("low of 20 in GW1");
  });

  it("sheep_index stings at a 60% template squad", () => {
    const owned = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const rare = [10, 11, 12, 13, 14];
    const players = Object.assign(
      {},
      ...owned.map((id) => player(id, "owned " + id, 50)),
      ...rare.map((id) => player(id, "rare " + id, 2)),
      player(99, "captain", 2),
    );
    const fact = sheepIndex(
      manager({ picks: [squad(10, 99, [...owned, ...rare])] }),
      context({ players }),
    );
    expect(fact.value).toBe(60);
    expect(fact.sting).toBeGreaterThanOrEqual(THRESHOLD_STING);
  });

  it("chip_panic stings on an early wildcard", () => {
    const chips: ChipPlay[] = [{ name: "wildcard", gameweek: 2 }];
    const fact = chipPanic(manager({ chips }), context());
    expect(fact.value).toBe(1);
    expect(fact.sting).toBeGreaterThanOrEqual(THRESHOLD_STING);
    expect(fact.headline).toContain("wildcard in GW2");
  });

  it("chip_panic also catches a flat bench boost and a flat triple captain", () => {
    const fact = chipPanic(
      manager({
        chips: [
          { name: "bboost", gameweek: 3 },
          { name: "3xc", gameweek: 4 },
        ],
        history: [week(3), week(4)],
        picks: [bench(3, 77), squad(4, 99, [], "3xc")],
      }),
      context({ playerPoints: { ...points(99, { 4: 2 }), ...points(77, { 3: 4 }) } }),
    );
    expect(fact.value).toBe(2);
    expect(fact.headline).toContain("bench boost for 4 in GW3");
    expect(fact.headline).toContain("triple captain for 2 in GW4");
  });

  it("dead_wood stings on one long-kept passenger", () => {
    const picks = [1, 2, 3, 4, 5].map((gw) => squad(gw, 99, [42]));
    const fact = deadWood(
      manager({ picks }),
      context({
        players: player(42, "Doak"),
        playerPoints: points(42, { 1: 1, 2: 1, 3: 1, 4: 0, 5: 1 }),
      }),
    );
    expect(fact.value).toBe(1);
    expect(fact.sting).toBeGreaterThanOrEqual(THRESHOLD_STING);
    expect(fact.headline).toContain("Doak");
  });

  it("cap_blank stings at three captain blanks", () => {
    const picks = [1, 2, 3].map((gw) => squad(gw, 99));
    const fact = capBlank(
      manager({ picks }),
      context({ players: player(99, "Isak"), playerPoints: points(99, { 1: 2, 2: 1, 3: 2 }) }),
    );
    expect(fact.value).toBe(3);
    expect(fact.sting).toBeGreaterThanOrEqual(THRESHOLD_STING);
    expect(fact.headline).toContain("Isak");
  });

  it("serial_chaser stings at three chases of the previous week's top scorer", () => {
    const transfers: Transfer[] = [2, 3, 4].map((gameweek) => ({
      gameweek,
      playerIn: 7,
      playerOut: 8,
    }));
    const gameweeks = [1, 2, 3, 4].map((id) => ({
      id,
      finished: true,
      deadline: "2026-08-21T17:30:00Z",
      topPlayer: 7,
    }));
    const fact = serialChaser(
      manager({ transfers }),
      context({ gameweeks, players: player(7, "Semenyo") }),
    );
    expect(fact.value).toBe(3);
    expect(fact.sting).toBeGreaterThanOrEqual(THRESHOLD_STING);
    expect(fact.headline).toContain("Semenyo");
  });

  it("gives a manager who did nothing wrong no sting at all", () => {
    const quiet = computeFacts(manager({ history: [week(1)] }), context());
    for (const fact of quiet) expect(fact.sting).toBe(0);
  });
});
