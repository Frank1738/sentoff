// Rating, card colour and card size, derived from a manager's top fact. Pure, no imports beyond types,
// so pages, client components and the image routes can all share one set of rules.
import type { Manager } from "@/lib/types";

export type CardColour = "red" | "yellow" | null;
export type CardSize = "hero" | "standard" | "compact";

/** Sting at or above this is a red card, below `YELLOW_AT` is no card at all. */
export const RED_AT = 75;
export const YELLOW_AT = 35;
/** The leader keeps "Man of the match" only while their own worst fact stays under this. */
export const MOTM_UNDER = 50;
/** Standard cards handed out after the heroes, by sting. Everyone left is compact. */
const STANDARD_CARDS = 2;

/** The sharpest fact's sting. `facts` arrives highest sting first from lib/facts. */
export function topSting(manager: Manager): number {
  return manager.facts[0]?.sting ?? 0;
}

/** Rating out of 10: the design's `round((100 - sting) / 10)`. An opted-out manager is not rated. */
export function ratingFor(manager: Manager): number {
  return Math.round((100 - topSting(manager)) / 10);
}

/** Red, yellow or nothing. Opted-out managers never get a card. */
export function cardFor(manager: Manager): CardColour {
  if (manager.optedOut) return null;
  const sting = topSting(manager);
  if (sting >= RED_AT) return "red";
  if (sting >= YELLOW_AT) return "yellow";
  return null;
}

export function cardLabel(colour: CardColour): string {
  return colour === "red" ? "Red card" : colour === "yellow" ? "Yellow card" : "No card";
}

/**
 * Which managers get which card size: the leader and the league's worst offender are heroes,
 * the next two by sting are standard, everyone else is compact. Opted-out managers stay compact.
 */
export function sizesFor(managers: Manager[]): Map<number, CardSize> {
  const sizes = new Map<number, CardSize>();
  for (const manager of managers) sizes.set(manager.entry, "compact");

  const rated = managers.filter((manager) => !manager.optedOut);
  const bySting = [...rated].sort((a, b) => topSting(b) - topSting(a) || a.rank - b.rank);
  const leader = rated.find((manager) => manager.rank === Math.min(...rated.map((m) => m.rank)));

  const heroes = new Set<number>();
  if (leader) heroes.add(leader.entry);
  if (bySting[0]) heroes.add(bySting[0].entry);
  for (const entry of heroes) sizes.set(entry, "hero");

  let given = 0;
  for (const manager of bySting) {
    if (given >= STANDARD_CARDS) break;
    if (heroes.has(manager.entry)) continue;
    sizes.set(manager.entry, "standard");
    given++;
  }
  return sizes;
}

/** The label across a hero card. The leader keeps the compliment until their own facts bite. */
export function heroLabel(manager: Manager, isLeader: boolean): string {
  return isLeader && topSting(manager) < MOTM_UNDER ? "Man of the match" : "Sent off";
}

/** True when this hero card is the backhanded compliment rather than the sending off. */
export function isManOfTheMatch(manager: Manager, isLeader: boolean): boolean {
  return heroLabel(manager, isLeader) === "Man of the match";
}

export function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix}`;
}

/** "▲ 3", "▼ 2" or an en dash. `lastRank` is 0 in the first gameweek, which is no movement. */
export function moveLabel(rank: number, lastRank: number): string {
  if (!lastRank) return "–";
  const move = lastRank - rank;
  if (move > 0) return `▲ ${move}`;
  if (move < 0) return `▼ ${Math.abs(move)}`;
  return "–";
}

/** The small line above a name: "7th  ▼ 2  ·  688 pts". */
export function metaLine(manager: Manager): string {
  const move = moveLabel(manager.rank, manager.lastRank);
  const arrow = move === "–" ? "" : `  ${move}`;
  return `${ordinal(manager.rank)}${arrow}  ·  ${manager.totalPoints} pts`;
}

/** The line under the roast: the facts behind it, numbers and all. */
export function numbersLine(manager: Manager): string {
  return manager.facts
    .slice(0, 2)
    .map((fact) => fact.headline.replace(/\.$/, ""))
    .join(". ")
    .concat(manager.facts.length > 0 ? "." : "");
}

/** The one-line version used on compact cards and in the share image. */
export function shortLine(manager: Manager): string {
  const first = manager.facts[0];
  if (!first) return `${manager.name}. Nothing on file.`;
  return `${manager.name}. ${first.headline.replace(/\.$/, "")}.`;
}

/** "7th · The Bench Warmer", the strap across the top of a share image. */
export function shareMeta(manager: Manager, isLeader: boolean): string {
  const label = isManOfTheMatch(manager, isLeader) ? "Man of the match" : manager.archetype;
  return `${ordinal(manager.rank)} · ${label}`;
}

/** The sharpest sentence of the roast, for the hero card and the share image. */
export function sharpLine(manager: Manager): string {
  const sentences = manager.roast.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length === 0) return manager.roast;
  return (sentences[sentences.length - 1] ?? manager.roast).trim();
}
