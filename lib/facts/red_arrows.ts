// red_arrows: longest run of consecutive gameweeks where overall_rank got worse than the week before. Sting rises when >= 3.
import type { Fact, ManagerData } from "../types";
import { type FactContext, historyInOrder, scale } from "./context";

export function redArrows(manager: ManagerData, _context: FactContext): Fact {
  const rows = historyInOrder(manager);
  let best = 0;
  let run = 0;
  let endedAt = 0;
  for (let i = 1; i < rows.length; i++) {
    run = rows[i].overallRank > rows[i - 1].overallRank ? run + 1 : 0;
    if (run > best) {
      best = run;
      endedAt = rows[i].gameweek;
    }
  }
  const headline =
    best === 0
      ? "No back-to-back red arrows"
      : `${best} red arrows in a row, the last landing in GW${endedAt}`;
  return { key: "red_arrows", headline, value: best, sting: scale(best, 1, 5) };
}
