// serial_chaser: transfers in of the previous gameweek's top scorer (events[].top_element). Sting rises when >= 3.
import type { Fact, ManagerData } from "../types";
import { type FactContext, playerName, scale } from "./context";

export function serialChaser(manager: ManagerData, context: FactContext): Fact {
  const topByGameweek = new Map(context.league.gameweeks.map((week) => [week.id, week.topPlayer]));
  const chased: number[] = [];
  for (const transfer of manager.transfers) {
    const top = topByGameweek.get(transfer.gameweek - 1);
    if (top != null && top === transfer.playerIn) chased.push(transfer.playerIn);
  }
  const last = chased[chased.length - 1];
  const headline =
    chased.length === 0
      ? "Never chased last week's top scorer"
      : `Bought last week's top scorer ${chased.length} ${chased.length === 1 ? "time" : "times"}, most recently ${playerName(context, last)}`;
  return { key: "serial_chaser", headline, value: chased.length, sting: scale(chased.length, 0, 6) };
}
