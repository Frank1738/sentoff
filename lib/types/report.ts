// Shared types for the report, managers and facts.

/** The eleven roast facts. Positive facts (green arrows, best differential) are not in this union yet. */
export type FactKey =
  | "bench_burner"
  | "loyalty_card"
  | "hit_man"
  | "the_curse"
  | "red_arrows"
  | "cucumber"
  | "sheep_index"
  | "chip_panic"
  | "dead_wood"
  | "cap_blank"
  | "serial_chaser";

export type Archetype =
  | "The Bench Warmer"
  | "The Loyalist"
  | "The Minus Four Merchant"
  | "The Panic Seller"
  | "The Freefaller"
  | "The Cucumber"
  | "The Sheep"
  | "The Chip Burner"
  | "The Hoarder"
  | "The Captaincy Criminal"
  | "The Serial Chaser";

/** Archetype shown on the card, chosen from the manager's highest-sting fact. */
export const ARCHETYPE_BY_FACT: Record<FactKey, Archetype> = {
  bench_burner: "The Bench Warmer",
  loyalty_card: "The Loyalist",
  hit_man: "The Minus Four Merchant",
  the_curse: "The Panic Seller",
  red_arrows: "The Freefaller",
  cucumber: "The Cucumber",
  sheep_index: "The Sheep",
  chip_panic: "The Chip Burner",
  dead_wood: "The Hoarder",
  cap_blank: "The Captaincy Criminal",
  serial_chaser: "The Serial Chaser",
};

/** One computed fact. `sting` is 0 to 100, ranked within the league. */
export interface Fact {
  key: FactKey;
  headline: string;
  value: number | string;
  sting: number;
}

/** One manager in the report. Names are capped at 40 characters before they get here. */
export interface Manager {
  entry: number;
  name: string;
  teamName: string;
  rank: number;
  lastRank: number;
  totalPoints: number;
  archetype: Archetype;
  roast: string;
  /** The top facts behind the roast, highest sting first. */
  facts: Fact[];
  /** True when the entry is on the blocklist; the card renders as "opted out". */
  optedOut: boolean;
}

/** One league award: Golden Boot of Shame, Red Card, Benchwarmer of the Year, Wooden Spoon. */
export interface Award {
  title: string;
  entry: number;
  line: string;
}

/** The finished league report, cached under `league:{id}:gw{n}`. */
export interface Report {
  leagueId: number;
  leagueName: string;
  gameweek: number;
  builtAt: string;
  managers: Manager[];
  awards: Award[];
}
