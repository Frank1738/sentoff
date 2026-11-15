"use client";

// A cold league: opens the build stream and renders its three phases in order - the standings
// strip, the read counter, then one card per writer call as it lands.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Manager, Report } from "@/lib/types";
import Loading, { LoadingHeader } from "./loading";
import ManagerCard from "./manager-card";
import ReportView from "./report-view";
import Standings, { type StandingsRow } from "./standings";
import StickyColumn from "./sticky-column";
import { RETRY_AFTER_SECONDS, type StreamErrorCode, type StreamEvent } from "./stream-events";

interface State {
  leagueName: string;
  gameweek: number;
  total: number;
  read: number;
  standings: StandingsRow[];
  cards: Manager[];
  report: Report | null;
  error: { code: StreamErrorCode; message: string } | null;
  paused: boolean;
}

const EMPTY: State = {
  leagueName: "",
  gameweek: 0,
  total: 0,
  read: 0,
  standings: [],
  cards: [],
  report: null,
  error: null,
  paused: false,
};

export default function LeagueStream({ leagueId, you }: { leagueId: number; you?: number }) {
  const [state, setState] = useState<State>(EMPTY);
  const [countdown, setCountdown] = useState(RETRY_AFTER_SECONDS);
  const [attempt, setAttempt] = useState(0);

  /** Starts the build again from nothing, by hand or when the paused countdown runs out. */
  const retry = useCallback(() => {
    setState({ ...EMPTY });
    setCountdown(RETRY_AFTER_SECONDS);
    setAttempt((n) => n + 1);
  }, []);

  const apply = useCallback((event: StreamEvent) => {
    if (event.type === "paused") setCountdown(RETRY_AFTER_SECONDS);
    setState((current) => {
      switch (event.type) {
        case "standings":
          return {
            ...current,
            leagueName: event.leagueName,
            gameweek: event.gameweek,
            total: event.total,
            standings: event.standings,
          };
        case "progress":
          return { ...current, read: event.done, total: event.total };
        case "card":
          return { ...current, cards: [...current.cards, event.manager], total: event.total };
        case "report":
          return { ...current, report: event.report };
        case "paused":
          return { ...current, paused: true, read: event.done || current.read };
        case "error":
          return { ...current, error: { code: event.code, message: event.message } };
        default:
          return current;
      }
    });
  }, []);

  // The stream opens on a timer, not straight away. React Strict Mode mounts twice in dev, and a
  // request opened on the first, discarded mount would take the per-league lock and leave the
  // real one stuck or told the league is already being read.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void open(), 0);

    async function open() {
      try {
        const response = await fetch(`/api/league/${leagueId}`, { signal: controller.signal });
        const body = response.body;
        if (!body) throw new Error("no body");
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.trim() === "") continue;
            try {
              apply(JSON.parse(line) as StreamEvent);
            } catch {
              // A half-written line is harmless: the next read completes it.
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        apply({ type: "error", code: "failed", message: "The connection dropped. Try again." });
      }
    }

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [leagueId, attempt, apply]);

  // The rate-limit screen counts down and then retries on its own.
  useEffect(() => {
    if (!state.paused) return;
    const timer = setInterval(() => {
      setCountdown((left) => {
        if (left <= 1) {
          retry();
          return RETRY_AFTER_SECONDS;
        }
        return left - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [state.paused, retry]);

  // The cards are already on screen, so the report must not enter again.
  if (state.report) return <ReportView report={state.report} you={you} entered />;

  if (state.error) {
    return (
      <StreamNotice
        code={state.error.code}
        message={state.error.message}
        leagueId={leagueId}
        onRetry={retry}
      />
    );
  }

  const byRank = [...state.cards].sort((a, b) => a.rank - b.rank);
  const newest = state.cards[state.cards.length - 1]?.entry;

  return (
    <main className="mx-auto w-full max-w-[430px] pb-10 lg:flex lg:max-w-[1200px] lg:items-start lg:justify-center lg:gap-24 lg:px-10">
      <StickyColumn top={0}>
        <LoadingHeader leagueId={leagueId} leagueName={state.leagueName || `League ${leagueId}`}>
          <Loading
            done={state.read}
            total={state.total}
            rated={state.cards.length}
            paused={state.paused}
            note={
              state.paused
                ? `FPL has asked us to slow down. Retrying on its own in ${countdown} seconds.`
                : state.cards.length > 0
                  ? "Writing the ratings."
                  : undefined
            }
          />
        </LoadingHeader>
        {state.paused && (
          <div className="px-5 lg:px-0">
            <button
              type="button"
              onClick={retry}
              className="h-14 w-full rounded-card bg-red text-[17px] font-semibold text-bg"
            >
              Try again
            </button>
          </div>
        )}
        {state.standings.length > 0 && <Standings managers={state.standings} you={you} />}
      </StickyColumn>
      <div className="lg:w-[430px] lg:flex-none">
        {byRank.length > 0 && (
          <section className="flex flex-col border-t border-line px-5 pt-[18px] wide:mx-5 wide:px-0 lg:mx-0 lg:border-t-0 lg:pt-6">
            <h2 className="text-fluid-17 font-semibold">Player ratings</h2>
            {byRank.map((manager) => (
              <ManagerCard
                key={manager.entry}
                manager={manager}
                leagueId={leagueId}
                size="standard"
                arriving={manager.entry === newest}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

/** The error screens from the design, each with the way out it asks for. */
function StreamNotice({
  code,
  message,
  leagueId,
  onRetry,
}: {
  code: StreamErrorCode;
  message: string;
  leagueId: number;
  onRetry: () => void;
}) {
  const title =
    code === "not_found"
      ? "No such league."
      : code === "private"
        ? "That league is private."
        : code === "building"
          ? "Already reading that league."
          : code === "busy"
            ? "Busy just now."
            : "That did not work.";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pt-7 pb-8">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="block h-[21px] w-[15px] rounded-[2px] bg-red" />
        <span className="font-display text-[20px] leading-none font-bold">Sent Off</span>
      </div>
      <h1 className="mt-[120px] font-display text-fluid-38 font-bold">{title}</h1>
      <div className="mt-6 flex flex-col gap-3.5">
        <p role="alert" className="flex items-start gap-3 text-[15px] leading-[23px]">
          <span
            role="img"
            aria-label="Yellow card"
            className="mt-0.5 block h-[19px] w-[14px] flex-none rounded-[2px] border border-bg/45 bg-yellow"
          />
          <span>{message}</span>
        </p>
        {code === "private" && (
          <p className="text-[14px] leading-5 text-muted">
            Paste your team ID instead and we will find every league you are in. It is the number in
            the URL of your Points page.
          </p>
        )}
        {code === "not_found" ? (
          <Link
            href="/"
            className="mt-1.5 flex h-14 items-center justify-center rounded-card bg-red text-[17px] font-semibold text-bg no-underline"
          >
            Try again
          </Link>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1.5 h-14 rounded-card bg-red text-[17px] font-semibold text-bg"
          >
            Try again
          </button>
        )}
        <p className="nums text-[14px] text-muted">League {leagueId}</p>
      </div>
    </main>
  );
}
