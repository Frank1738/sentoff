// hit_man: points paid on hits (event_transfers_cost summed) and the worst one (incoming player's points that GW). Sting rises when the incoming scored <= 2.
import type { Fact, ManagerData } from "../types";
import { type FactContext, historyInOrder, playerName, playerPoints, scale } from "./context";

export function hitMan(manager: ManagerData, context: FactContext): Fact {
  const cost = manager.history.reduce((sum, row) => sum + row.transferCost, 0);
  let worst: { player: number; points: number; gameweek: number } | null = null;
  for (const row of historyInOrder(manager)) {
    if (row.transferCost <= 0) continue;
    for (const transfer of manager.transfers) {
      if (transfer.gameweek !== row.gameweek) continue;
      const points = playerPoints(context, transfer.playerIn, row.gameweek);
      if (worst === null || points < worst.points) {
        worst = { player: transfer.playerIn, points, gameweek: row.gameweek };
      }
    }
  }
  const base = scale(cost, 0, 24);
  const sting = cost > 0 && worst !== null && worst.points <= 2 ? Math.min(100, base + 50) : base;
  const headline =
    cost === 0
      ? "No hits taken all season"
      : worst === null
        ? `${cost} points paid on hits`
        : `${cost} points paid on hits, and ${playerName(context, worst.player)} came in for ${worst.points} in GW${worst.gameweek}`;
  return { key: "hit_man", headline, value: cost, sting };
}
