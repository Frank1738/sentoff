// cucumber: gameweeks where this manager's points equalled the lowest score in the league. Sting rises when >= 2.
import type { Fact, ManagerData } from "../types";
import { type FactContext, historyInOrder, scale } from "./context";

export function cucumber(manager: ManagerData, context: FactContext): Fact {
  let count = 0;
  let worst: { gameweek: number; points: number } | null = null;
  for (const row of historyInOrder(manager)) {
    if (context.lowestByGameweek[row.gameweek] !== row.points) continue;
    count++;
    if (worst === null || row.points < worst.points) worst = { gameweek: row.gameweek, points: row.points };
  }
  const headline =
    worst === null
      ? "Never the worst score of the week"
      : `Bottom of the league ${count} ${count === 1 ? "gameweek" : "gameweeks"}, low of ${worst.points} in GW${worst.gameweek}`;
  return { key: "cucumber", headline, value: count, sting: scale(count, 0, 4) };
}
