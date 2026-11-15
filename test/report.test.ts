// The page layer's own rules: rating, card colour, card size, and how long a report is cached.
import { describe, expect, it } from "vitest";
import {
  RED_AT,
  YELLOW_AT,
  cardFor,
  heroLabel,
  metaLine,
  moveLabel,
  numbersLine,
  ordinal,
  ratingFor,
  shareMeta,
  sharpLine,
  shortLine,
  sizesFor,
  topSting,
} from "../components/card-rules";
import { reportRoastUrl } from "../components/site";
import { computeLeague } from "../lib/facts";
import { LIVE_TTL_SECONDS } from "../lib/redis";
import { reportTtl } from "../lib/report";
import type { Fact, LeagueData, Manager, ManagerData } from "../lib/types";
import fixture from "./fixtures/league.json";

const league = fixture.league as LeagueData;
const managerData = fixture.managers as ManagerData[];
const { managers } = computeLeague(league, managerData);

/** A card with just enough on it to score, so a rule can be aimed at one sting. */
function card(sting: number, over: Partial<Manager> = {}): Manager {
  const fact: Fact = { key: "bench_burner", headline: "47 points left on the bench", value: 47, sting };
  return {
    entry: 1,
    name: "Dave",
    teamName: "Salah Deal",
    rank: 7,
    lastRank: 5,
    totalPoints: 688,
    archetype: "The Bench Warmer",
    roast: "Forty-seven points on the bench. His subs have a better record than his first team.",
    facts: [fact],
    optedOut: false,
    ...over,
  };
}

describe("rating", () => {
  it("is the design's round((100 - sting) / 10)", () => {
    expect(ratingFor(card(0))).toBe(10);
    expect(ratingFor(card(31))).toBe(7);
    expect(ratingFor(card(64))).toBe(4);
    expect(ratingFor(card(91))).toBe(1);
    expect(ratingFor(card(100))).toBe(0);
  });

  it("reads the sharpest fact, which lib/facts puts first", () => {
    const two = card(10, {
      facts: [
        { key: "cap_blank", headline: "3 captain blanks", value: 3, sting: 80 },
        { key: "bench_burner", headline: "47 bench points", value: 47, sting: 10 },
      ],
    });
    expect(topSting(two)).toBe(80);
    expect(ratingFor(two)).toBe(2);
  });

  it("stays inside 0 to 10 for every manager in the fixture", () => {
    for (const manager of managers) {
      expect(ratingFor(manager)).toBeGreaterThanOrEqual(0);
      expect(ratingFor(manager)).toBeLessThanOrEqual(10);
    }
  });
});

describe("card colour", () => {
  it("turns yellow then red at the thresholds", () => {
    expect(cardFor(card(YELLOW_AT - 1))).toBeNull();
    expect(cardFor(card(YELLOW_AT))).toBe("yellow");
    expect(cardFor(card(RED_AT - 1))).toBe("yellow");
    expect(cardFor(card(RED_AT))).toBe("red");
  });

  it("never books someone who opted out", () => {
    expect(cardFor(card(99, { optedOut: true }))).toBeNull();
  });
});

describe("card size", () => {
  const spread = (stings: number[]): Manager[] =>
    stings.map((sting, index) =>
      card(sting, { entry: index + 1, rank: index + 1, facts: [
        { key: "bench_burner", headline: `${index} points`, value: index, sting },
      ] }),
    );

  it("gives the leader and the worst offender the hero cards", () => {
    const sizes = sizesFor(spread([20, 40, 95, 30, 25]));
    expect(sizes.get(1)).toBe("hero");
    expect(sizes.get(3)).toBe("hero");
  });

  it("hands the next two by sting a standard card and the rest compact", () => {
    const sizes = sizesFor(spread([20, 40, 95, 30, 25]));
    expect(sizes.get(2)).toBe("standard");
    expect(sizes.get(4)).toBe("standard");
    expect(sizes.get(5)).toBe("compact");
  });

  it("gives the leader one hero card, not two, when they are also the worst", () => {
    const sizes = sizesFor(spread([95, 40, 30]));
    expect([...sizes.values()].filter((size) => size === "hero")).toHaveLength(1);
  });

  it("sizes every manager in the fixture exactly once", () => {
    const sizes = sizesFor(managers);
    expect(sizes.size).toBe(managers.length);
    for (const manager of managers) expect(sizes.get(manager.entry)).toBeDefined();
  });
});

describe("hero label", () => {
  it("compliments a clean leader and sends off a guilty one", () => {
    expect(heroLabel(card(31), true)).toBe("Man of the match");
    expect(heroLabel(card(64), true)).toBe("Sent off");
    expect(heroLabel(card(31), false)).toBe("Sent off");
  });

  it("puts the label, not the archetype, on the leader's share image", () => {
    expect(shareMeta(card(31, { rank: 1 }), true)).toBe("1st · Man of the match");
    expect(shareMeta(card(91, { rank: 20 }), false)).toBe("20th · The Bench Warmer");
  });
});

describe("the small print on a card", () => {
  it("writes ordinals the way the design does", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 20, 21].map(ordinal)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "20th",
      "21st",
    ]);
  });

  it("points the arrow the way the manager moved", () => {
    expect(moveLabel(5, 8)).toBe("▲ 3");
    expect(moveLabel(8, 5)).toBe("▼ 3");
    expect(moveLabel(5, 5)).toBe("–");
    expect(moveLabel(5, 0)).toBe("–");
  });

  it("builds the meta line from rank, movement and points", () => {
    expect(metaLine(card(50))).toBe("7th  ▼ 2  ·  688 pts");
    expect(metaLine(card(50, { lastRank: 0 }))).toBe("7th  ·  688 pts");
  });

  it("shows the facts behind the roast, numbers and all", () => {
    expect(numbersLine(card(50))).toBe("47 points left on the bench.");
  });

  it("ends the share image on the sharpest sentence", () => {
    expect(sharpLine(card(50))).toBe("His subs have a better record than his first team.");
  });

  it("gives a compact card one line of its own", () => {
    expect(shortLine(card(50))).toBe("Dave. 47 points left on the bench.");
  });
});

describe("the report link", () => {
  it("encodes the roast, so punctuation cannot break the URL", () => {
    const url = reportRoastUrl(1500, 42, 'Dave & "the bench" = 47 points? #shocking');
    expect(url).toContain("github.com/Frank1738/sentoff/issues/new");
    expect(url).not.toMatch(/\s/);
    expect(url).toContain("%22the%20bench%22");
    expect(url).toContain("%23shocking");
    expect(new URL(url).searchParams.get("body")).toContain("47 points");
  });
});

describe("how long a report is cached", () => {
  it("holds a live gameweek for an hour", () => {
    expect(reportTtl(false, new Date(Date.now() + 86_400_000).toISOString())).toBe(LIVE_TTL_SECONDS);
  });

  it("holds a finished gameweek until the next deadline", () => {
    const ttl = reportTtl(true, new Date(Date.now() + 7_200_000).toISOString());
    expect(ttl).toBeGreaterThan(7_000);
    expect(ttl).toBeLessThanOrEqual(7_200);
  });

  it("falls back to an hour when the deadline is missing or already gone", () => {
    expect(reportTtl(true, null)).toBe(LIVE_TTL_SECONDS);
    expect(reportTtl(true, new Date(Date.now() - 1000).toISOString())).toBe(LIVE_TTL_SECONDS);
    expect(reportTtl(true, "not a date")).toBe(LIVE_TTL_SECONDS);
  });
});
