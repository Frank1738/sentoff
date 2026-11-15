// sheep_index: share of the latest 15 picks owned by more than 30% of FPL (selected_by_percent). Sting rises when >= 60%.
import type { Fact, ManagerData } from "../types";
import { type FactContext, scale, squadsInOrder } from "./context";

/** A player this widely owned counts as a template pick. */
const TEMPLATE_OWNERSHIP = 30;

export function sheepIndex(manager: ManagerData, context: FactContext): Fact {
  const squads = squadsInOrder(manager);
  const latest = squads[squads.length - 1];
  if (!latest || latest.picks.length === 0) {
    return { key: "sheep_index", headline: "No squad to read", value: 0, sting: 0 };
  }
  const owned = latest.picks.filter(
    (pick) => (context.league.players[pick.player]?.ownership ?? 0) > TEMPLATE_OWNERSHIP,
  ).length;
  const percent = Math.round((owned / latest.picks.length) * 100);
  return {
    key: "sheep_index",
    headline: `${owned} of the ${latest.picks.length} in GW${latest.gameweek} are owned by over ${TEMPLATE_OWNERSHIP}% of FPL, ${percent}% of the squad`,
    value: percent,
    sting: scale(percent, 20, 100),
  };
}
