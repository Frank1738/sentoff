// loyalty_card: longest same-captain streak across GW picks. Sting rises when streak >= 5.
import type { Fact, ManagerData } from "../types";
import { type FactContext, captainOf, playerName, scale, squadsInOrder } from "./context";

export function loyaltyCard(manager: ManagerData, context: FactContext): Fact {
  let best = 0;
  let bestPlayer: number | null = null;
  let run = 0;
  let previous: number | null = null;
  for (const squad of squadsInOrder(manager)) {
    const captain = captainOf(squad);
    if (captain === null) {
      run = 0;
      previous = null;
      continue;
    }
    run = captain === previous ? run + 1 : 1;
    previous = captain;
    if (run > best) {
      best = run;
      bestPlayer = captain;
    }
  }
  const headline =
    bestPlayer === null
      ? "No captain picked yet"
      : `Captained ${playerName(context, bestPlayer)} ${best} gameweeks running`;
  return { key: "loyalty_card", headline, value: best, sting: scale(best, 1, 9) };
}
