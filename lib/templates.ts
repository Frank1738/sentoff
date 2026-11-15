// Fallback lines, one per fact key. Used when no API key is set, the call fails, or the Claude cap is hit.
import type { Fact, FactKey } from "./types";

/** How many fact lines a fallback roast strings together. */
const LINES_IN_ROAST = 2;

/**
 * One line per fact key. Numbers come from the fact, never from anywhere else, so a
 * template line passes the same number check the writer's output has to pass.
 */
export const TEMPLATES: Record<FactKey, (value: number, headline: string) => string> = {
  bench_burner: (value) =>
    `${value} points left rotting on the bench. Picking eleven is half the job and that half is not going well.`,
  loyalty_card: (value) =>
    `Same armband ${value} weeks running. Loyalty is lovely in a marriage and ruinous in a fantasy side.`,
  hit_man: (value) =>
    `${value} points handed straight back in hits. Paying for the privilege of getting it wrong takes real commitment.`,
  the_curse: (value) =>
    `Sold a man who then put ${value} points on the board. The transfer market is clearly not the strong suit.`,
  red_arrows: (value) =>
    `${value} gameweeks of red arrows in a row. That is not a dip, that is a trajectory.`,
  cucumber: (value) =>
    `Lowest score in the league ${value} times. Someone has to prop up the weekend and it is always the same someone.`,
  sheep_index: (value) =>
    `${value}% of the squad is pure template. Bold is not the word anybody reaches for here.`,
  chip_panic: (value) =>
    `${value} chips burned for nothing. Saving them for the right week was apparently too much to ask.`,
  dead_wood: (value) =>
    `${value} passengers kept in the side for weeks on end. Sentiment is not a strategy.`,
  cap_blank: (value) =>
    `${value} captain blanks. The armband keeps landing on whoever has decided to take the afternoon off.`,
  serial_chaser: (value) =>
    `Chased last week's top scorer ${value} times. Always a week late, always a hit short.`,
};

/** The fallback line for one fact. Falls back to the fact's own headline if the key is ever unknown. */
export function templateLine(fact: Fact): string {
  const build = TEMPLATES[fact.key];
  const value = typeof fact.value === "number" ? fact.value : Number(fact.value) || 0;
  return build ? build(value, fact.headline) : `${fact.headline}.`;
}

/** The whole fallback roast: the two sharpest facts, sharpest last so it ends on the sting. */
export function templateRoast(facts: Fact[]): string {
  const picked = facts.slice(0, LINES_IN_ROAST);
  if (picked.length === 0) return "Nothing incriminating on file this week. Enjoy it while it lasts.";
  return [...picked].reverse().map(templateLine).join(" ");
}
