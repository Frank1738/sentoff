// chip_panic: wildcard before GW4, bench boost whose four bench slots returned < 10, triple captain whose captain returned < 10. Sting rises on any.
import type { Fact, ManagerData } from "../types";
import { type FactContext, captainOf, playerPoints, scale } from "./context";

/** A wildcard this early is panic, not a plan. */
const EARLY_WILDCARD_BEFORE = 4;
/** A chip returning less than this was wasted. */
const WASTED_UNDER = 10;
/** Picks in these slots are the bench, which is what a bench boost adds. */
const FIRST_BENCH_SLOT = 12;

export function chipPanic(manager: ManagerData, context: FactContext): Fact {
  const wasted: string[] = [];
  for (const chip of manager.chips) {
    const squad = manager.picks.find((entry) => entry.gameweek === chip.gameweek);
    if (chip.name === "wildcard" && chip.gameweek < EARLY_WILDCARD_BEFORE) {
      wasted.push(`wildcard in GW${chip.gameweek}`);
    }
    // points_on_bench is 0 in a bench boost week, because nothing is on the bench, so add the four slots up.
    if (chip.name === "bboost" && squad) {
      const bench = squad.picks
        .filter((pick) => pick.slot >= FIRST_BENCH_SLOT)
        .reduce((sum, pick) => sum + playerPoints(context, pick.player, chip.gameweek), 0);
      if (bench < WASTED_UNDER) wasted.push(`bench boost for ${bench} in GW${chip.gameweek}`);
    }
    if (chip.name === "3xc" && squad) {
      const captain = captainOf(squad);
      const points = captain === null ? 0 : playerPoints(context, captain, chip.gameweek);
      if (points < WASTED_UNDER) wasted.push(`triple captain for ${points} in GW${chip.gameweek}`);
    }
  }
  const headline = wasted.length === 0 ? "No chips wasted" : `Chips burned: ${wasted.join(", ")}`;
  return { key: "chip_panic", headline, value: wasted.length, sting: scale(wasted.length, 0, 2) };
}
