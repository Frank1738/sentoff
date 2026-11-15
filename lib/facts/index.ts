// Runs every fact rule for each manager, then ranks sting across the league.
import {
  ARCHETYPE_BY_FACT,
  type Archetype,
  type Award,
  type Fact,
  type FactKey,
  type LeagueData,
  type Manager,
  type ManagerData,
} from "../types";
import { benchBurner } from "./bench_burner";
import { capBlank } from "./cap_blank";
import { chipPanic } from "./chip_panic";
import { type FactContext, buildContext } from "./context";
import { cucumber } from "./cucumber";
import { deadWood } from "./dead_wood";
import { hitMan } from "./hit_man";
import { loyaltyCard } from "./loyalty_card";
import { redArrows } from "./red_arrows";
import { serialChaser } from "./serial_chaser";
import { sheepIndex } from "./sheep_index";
import { theCurse } from "./the_curse";

export { buildContext, type FactContext } from "./context";

/** Names from the API are hostile input, so nothing downstream sees more than this many characters. */
const MAX_NAME = 40;
/** How many facts a card and the writer get, highest sting first. */
const TOP_FACTS = 3;
/** Sting added to the league-worst holder of a fact, and to the runner-up. */
const WORST_BONUS = 20;
const SECOND_BONUS = 10;

/** Every rule, in the order the spec lists them. A rule reads one manager plus the shared context. */
export const RULES: Array<(manager: ManagerData, context: FactContext) => Fact> = [
  benchBurner,
  loyaltyCard,
  hitMan,
  theCurse,
  redArrows,
  cucumber,
  sheepIndex,
  chipPanic,
  deadWood,
  capBlank,
  serialChaser,
];

/** Runs all eleven rules for one manager. Sting here is absolute; rankSting adds the league comparison. */
export function computeFacts(manager: ManagerData, context: FactContext): Fact[] {
  return RULES.map((rule) => rule(manager, context));
}

/**
 * Adds the league comparison the spec asks for: whoever is worst for a fact gets a bonus,
 * the runner-up a smaller one. Facts nobody triggered stay where they were. Input is not mutated.
 */
export function rankSting(factsByEntry: Map<number, Fact[]>): Map<number, Fact[]> {
  const copies = new Map<number, Fact[]>();
  for (const [entry, facts] of factsByEntry) copies.set(entry, facts.map((fact) => ({ ...fact })));

  const keys = new Set<FactKey>();
  for (const facts of copies.values()) for (const fact of facts) keys.add(fact.key);

  for (const key of keys) {
    const held = [...copies.values()]
      .map((facts) => facts.find((fact) => fact.key === key))
      .filter((fact): fact is Fact => fact !== undefined && numberOf(fact.value) > 0 && fact.sting > 0);
    if (held.length === 0) continue;
    const values = [...new Set(held.map((fact) => numberOf(fact.value)))].sort((a, b) => b - a);
    for (const fact of held) {
      const place = values.indexOf(numberOf(fact.value));
      if (place === 0) fact.sting = Math.min(100, fact.sting + WORST_BONUS);
      else if (place === 1) fact.sting = Math.min(100, fact.sting + SECOND_BONUS);
    }
  }
  return copies;
}

/** The title on the card, taken from the manager's highest-sting fact. */
export function archetypeFor(facts: Fact[]): Archetype {
  const top = [...facts].sort(bySting)[0];
  return ARCHETYPE_BY_FACT[top?.key ?? "bench_burner"];
}

/**
 * The full league pass: run the rules, rank sting across everyone, then build a card per
 * standings row in rank order plus the four awards. Roasts are filled in later by the writer.
 */
export function computeLeague(
  league: LeagueData,
  managers: ManagerData[],
): { managers: Manager[]; awards: Award[] } {
  const context = buildContext(league, managers);
  const byEntry = new Map<number, ManagerData>(managers.map((manager) => [manager.entry, manager]));

  const raw = new Map<number, Fact[]>();
  for (const entry of league.entries) {
    const data = byEntry.get(entry.entry);
    if (data) raw.set(entry.entry, computeFacts(data, context));
  }
  const ranked = rankSting(raw);

  const cards: Manager[] = [];
  for (const entry of [...league.entries].sort((a, b) => a.rank - b.rank)) {
    const facts = ranked.get(entry.entry);
    if (!facts) continue;
    const sorted = [...facts].sort(bySting);
    const stinging = sorted.filter((fact) => fact.sting > 0);
    cards.push({
      entry: entry.entry,
      name: cap(entry.name),
      teamName: cap(entry.teamName),
      rank: entry.rank,
      lastRank: entry.lastRank,
      totalPoints: entry.totalPoints,
      archetype: archetypeFor(sorted),
      roast: "",
      facts: (stinging.length > 0 ? stinging : sorted).slice(0, TOP_FACTS),
      optedOut: false,
    });
  }
  return { managers: cards, awards: buildAwards(cards, ranked) };
}

/** The four awards above the cards: three league worsts plus last place. */
export function buildAwards(managers: Manager[], factsByEntry: Map<number, Fact[]>): Award[] {
  const awards: Award[] = [];
  const add = (title: string, key: FactKey, line: (value: number, name: string) => string) => {
    const worst = worstFor(managers, factsByEntry, key);
    if (worst) awards.push({ title, entry: worst.manager.entry, line: line(worst.value, worst.manager.name) });
  };
  add("Golden Boot of Shame", "the_curse", (value, name) => `${name} sold a player who then scored ${value}.`);
  add("Red Card", "cap_blank", (value, name) => `${name} captained ${value} blanks.`);
  add("Benchwarmer of the Year", "bench_burner", (value, name) => `${name} left ${value} points on the bench.`);

  const spoon = managers.reduce(
    (last, manager) => (last === null || manager.rank > last.rank ? manager : last),
    null as Manager | null,
  );
  if (spoon) {
    awards.push({
      title: "Wooden Spoon",
      entry: spoon.entry,
      line: `${spoon.name} props up the table on ${spoon.totalPoints} points.`,
    });
  }
  return awards;
}

function worstFor(
  managers: Manager[],
  factsByEntry: Map<number, Fact[]>,
  key: FactKey,
): { manager: Manager; value: number } | null {
  let best: { manager: Manager; value: number } | null = null;
  for (const manager of managers) {
    const fact = factsByEntry.get(manager.entry)?.find((candidate) => candidate.key === key);
    const value = fact ? numberOf(fact.value) : 0;
    if (value <= 0) continue;
    if (best === null || value > best.value) best = { manager, value };
  }
  return best;
}

/** Highest sting first, then by key so the order never depends on the input order. */
function bySting(a: Fact, b: Fact): number {
  return b.sting - a.sting || a.key.localeCompare(b.key);
}

function numberOf(value: Fact["value"]): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

function cap(name: string): string {
  return name.slice(0, MAX_NAME);
}
