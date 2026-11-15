// bench_burner: total points left on bench (points_on_bench from entry history, plain sum). Sting rises when highest in league.
import type { Fact, ManagerData } from "../types";
import { type FactContext, scale } from "./context";

/** Bench points per gameweek that count as ordinary, and as league-worst. Scaled by weeks played so the season length does not matter. */
const NORMAL_PER_WEEK = 5;
const AWFUL_PER_WEEK = 15;

export function benchBurner(manager: ManagerData, _context: FactContext): Fact {
  const weeks = Math.max(1, manager.history.length);
  const total = manager.history.reduce((sum, row) => sum + row.benchPoints, 0);
  const worst = manager.history.reduce(
    (best, row) => (best === null || row.benchPoints > best.benchPoints ? row : best),
    null as ManagerData["history"][number] | null,
  );
  const headline =
    worst && worst.benchPoints > 0
      ? `${total} points left on the bench, ${worst.benchPoints} of them in GW${worst.gameweek}`
      : "Nothing left on the bench all season";
  return {
    key: "bench_burner",
    headline,
    value: total,
    sting: scale(total, NORMAL_PER_WEEK * weeks, AWFUL_PER_WEEK * weeks),
  };
}
