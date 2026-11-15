// The line protocol between /api/league/[id] and the client that renders a cold build.
// Types only, so importing it from a client component pulls nothing server side with it.
import type { Manager, Report } from "@/lib/types";
import type { StandingsRow } from "./standings";

/** Why a build stopped. Each one has its own screen in the design. */
export type StreamErrorCode = "not_found" | "private" | "busy" | "building" | "failed";

/** One newline-delimited JSON line from the build stream. */
export type StreamEvent =
  | {
      type: "standings";
      leagueName: string;
      gameweek: number;
      total: number;
      standings: StandingsRow[];
    }
  | { type: "progress"; done: number; total: number }
  | { type: "card"; done: number; total: number; manager: Manager }
  | { type: "report"; report: Report }
  | { type: "paused"; done: number; total: number; retryAfter: number }
  | { type: "error"; code: StreamErrorCode; message: string };

/** Seconds the rate-limit screen waits before it retries on its own. */
export const RETRY_AFTER_SECONDS = 30;
