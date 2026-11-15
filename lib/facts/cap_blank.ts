// cap_blank: gameweeks where the captain's own score (before the multiplier) was <= 2. Sting rises when >= 3.
import type { Fact, ManagerData } from "../types";
import { type FactContext, captainOf, playerName, playerPoints, scale, squadsInOrder } from "./context";

/** A captain at or under this returned nothing. */
const BLANK_AT_OR_UNDER = 2;

export function capBlank(manager: ManagerData, context: FactContext): Fact {
  let count = 0;
  let worst: { player: number; points: number; gameweek: number } | null = null;
  for (const squad of squadsInOrder(manager)) {
    const captain = captainOf(squad);
    if (captain === null) continue;
    const points = playerPoints(context, captain, squad.gameweek);
    if (points > BLANK_AT_OR_UNDER) continue;
    count++;
    if (worst === null || points < worst.points) {
      worst = { player: captain, points, gameweek: squad.gameweek };
    }
  }
  const headline =
    worst === null
      ? "Every captain returned something"
      : `${count} captain ${count === 1 ? "blank" : "blanks"}, the worst ${playerName(context, worst.player)} for ${worst.points} in GW${worst.gameweek}`;
  return { key: "cap_blank", headline, value: count, sting: scale(count, 0, 6) };
}
