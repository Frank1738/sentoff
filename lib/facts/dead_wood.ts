// dead_wood: players started (multiplier >= 1) in >= 5 gameweeks averaging <= 1 point over those gameweeks. Sting rises on any.
import type { Fact, ManagerData } from "../types";
import { type FactContext, playerName, playerPoints, scale, squadsInOrder } from "./context";

/** Keep someone this long and it is a choice, not bad luck. */
const MIN_STARTS = 5;
/** Average points per start at or below this is dead wood. */
const MAX_AVERAGE = 1;

export function deadWood(manager: ManagerData, context: FactContext): Fact {
  const tally = new Map<number, { starts: number; points: number }>();
  for (const squad of squadsInOrder(manager)) {
    for (const pick of squad.picks) {
      if (pick.multiplier < 1) continue;
      // Without that player's per-gameweek points we would score him 0 and call him a passenger.
      if (!context.league.playerPoints[pick.player]) continue;
      const row = tally.get(pick.player) ?? { starts: 0, points: 0 };
      row.starts++;
      row.points += playerPoints(context, pick.player, squad.gameweek);
      tally.set(pick.player, row);
    }
  }
  let worst: { player: number; starts: number; points: number } | null = null;
  let count = 0;
  for (const [player, row] of tally) {
    if (row.starts < MIN_STARTS || row.points / row.starts > MAX_AVERAGE) continue;
    count++;
    if (worst === null || row.points < worst.points) worst = { player, ...row };
  }
  const headline =
    worst === null
      ? "No passengers in the starting eleven"
      : `Started ${playerName(context, worst.player)} ${worst.starts} times for ${worst.points} points`;
  return { key: "dead_wood", headline, value: count, sting: scale(count, 0, 2) };
}
