// the_curse: the most points a sold player scored in the three gameweeks from the sale onwards (element-summary points). Sting rises when >= 20.
import type { Fact, ManagerData } from "../types";
import { type FactContext, playerName, playerPoints, scale } from "./context";

export function theCurse(manager: ManagerData, context: FactContext): Fact {
  const last = context.league.gameweek;
  let worst: { player: number; points: number; gameweek: number } | null = null;
  for (const transfer of manager.transfers) {
    let points = 0;
    for (let gw = transfer.gameweek; gw <= Math.min(transfer.gameweek + 2, last); gw++) {
      points += playerPoints(context, transfer.playerOut, gw);
    }
    if (worst === null || points > worst.points) {
      worst = { player: transfer.playerOut, points, gameweek: transfer.gameweek };
    }
  }
  const value = worst?.points ?? 0;
  const headline =
    worst === null || value === 0
      ? "No sold player came back to haunt them"
      : `Sold ${playerName(context, worst.player)} in GW${worst.gameweek}, who then scored ${value} in three gameweeks`;
  return { key: "the_curse", headline, value, sting: scale(value, 0, 40) };
}
