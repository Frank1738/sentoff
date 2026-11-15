// Builds the report, streams progress. Sets maxDuration.
import type { NextRequest } from "next/server";
import { RETRY_AFTER_SECONDS, type StreamEvent } from "@/components/stream-events";
import { FplError, parseId } from "@/lib/fpl";
import { releaseLock, takeLock } from "@/lib/redis";
import { buildReport, cachedReport, takeBuildSlot } from "@/lib/report";

export const maxDuration = 60;

/** The caller's address, for the per-IP cold-build counter. Only ever hashed, never stored raw. */
function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/league/[id]">,
): Promise<Response> {
  const { id } = await ctx.params;
  const leagueId = parseId(id);
  if (leagueId === null) {
    return line({ type: "error", code: "not_found", message: "That is not a league ID." }, 400);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      let total = 0;
      let done = 0;
      let locked = false;

      try {
        // A report that landed between the page render and this call still counts as a hit.
        const cached = await cachedReport(leagueId);
        if (cached) {
          send({ type: "report", report: cached });
          return;
        }

        const slot = await takeBuildSlot(clientIp(request));
        if (slot !== "ok") {
          send({
            type: "error",
            code: "busy",
            message:
              slot === "ip"
                ? "You have started a few leagues already. Give it ten minutes."
                : "Busy, try again shortly. Leagues already rated still load.",
          });
          return;
        }

        locked = await takeLock(leagueId);
        if (!locked) {
          send({
            type: "error",
            code: "building",
            message: "This league is already being read. Reload in a moment.",
          });
          return;
        }

        const report = await buildReport(leagueId, (progress) => {
          total = progress.total;
          if (progress.phase === "standings") {
            send({
              type: "standings",
              leagueName: progress.leagueName,
              gameweek: progress.gameweek,
              total: progress.total,
              standings: progress.standings,
            });
          } else if (progress.phase === "reading") {
            done = progress.done;
            send({ type: "progress", done: progress.done, total: progress.total });
          } else {
            send({ type: "card", done: progress.done, total: progress.total, manager: progress.manager });
          }
        });
        send({ type: "report", report });
      } catch (error) {
        send(failure(error, done, total));
      } finally {
        if (locked) await releaseLock(leagueId);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

/** Turns a thrown error into the one line the client knows how to render. Never leaks a stack. */
function failure(error: unknown, done: number, total: number): StreamEvent {
  if (error instanceof FplError) {
    if (error.notFound) {
      return { type: "error", code: "not_found", message: "FPL has no league with that ID." };
    }
    if (error.status === 403) {
      return { type: "error", code: "private", message: "FPL only shows that league to its members." };
    }
    if (error.status === 429) {
      return { type: "paused", done, total, retryAfter: RETRY_AFTER_SECONDS };
    }
  }
  return { type: "error", code: "failed", message: "Something went wrong reading that league." };
}

/** A single-line response for the cases that fail before the stream is worth opening. */
function line(event: StreamEvent, status: number): Response {
  return new Response(`${JSON.stringify(event)}\n`, {
    status,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
