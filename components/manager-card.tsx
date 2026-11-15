"use client";

// One manager card: name, team, rank arrow, the roast, the two facts behind it.
// Three sizes from the design: hero (light), standard (dark) and compact (two-column).
import { useState } from "react";
import { enterClass } from "@/lib/motion";
import type { Manager } from "@/lib/types";
import CardIcon from "./card-icon";
import {
  type CardSize,
  cardFor,
  heroLabel,
  isManOfTheMatch,
  metaLine,
  numbersLine,
  ordinal,
  ratingFor,
  shortLine,
} from "./card-rules";
import { reportRoastUrl } from "./site";

export interface ManagerCardProps {
  manager: Manager;
  leagueId: number;
  size: CardSize;
  /** True for the manager sitting top of the table, who may get the backhanded compliment. */
  isLeader?: boolean;
  /** True on the card that has just streamed in, for the 280ms arrival. */
  arriving?: boolean;
  /** Step in page order for a card entering with the page (lib/motion.ts). Unset: no entrance. */
  enter?: number;
}

/** What moves on a card: the arrival, the page entrance, or nothing. The icon stamps with either. */
interface Motion {
  className: string;
  stamp: boolean;
}

export default function ManagerCard({
  manager,
  leagueId,
  size,
  isLeader = false,
  arriving = false,
  enter,
}: ManagerCardProps) {
  const motion: Motion = {
    className: arriving ? "arrive" : enter === undefined ? "" : enterClass(enter),
    stamp: arriving || enter !== undefined,
  };
  if (size === "compact") return <Compact manager={manager} motion={motion} />;
  if (size === "hero") {
    return <Hero manager={manager} leagueId={leagueId} isLeader={isLeader} motion={motion} />;
  }
  return <Standard manager={manager} leagueId={leagueId} motion={motion} />;
}

function Hero({
  manager,
  leagueId,
  isLeader,
  motion,
}: {
  manager: Manager;
  leagueId: number;
  isLeader: boolean;
  motion: Motion;
}) {
  const colour = cardFor(manager);
  return (
    <article
      className={`my-4 flex flex-col rounded-card bg-text px-5 pt-6 pb-5 text-bg ${motion.className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="nums text-[13px] whitespace-pre text-dim">{metaLine(manager)}</span>
          <h3 className="font-display text-fluid-40 font-bold break-words">{manager.name}</h3>
          <span className="text-[15px] text-dim">{manager.teamName}</span>
        </div>
        <div className="flex flex-none items-end gap-3">
          <CardIcon colour={colour} size="hero" stamp={motion.stamp} className="mb-1" />
          <Rating manager={manager} size="hero" suffix={16} tone="text-dim" />
        </div>
      </div>
      <div className="mt-[18px] flex flex-wrap items-baseline gap-2.5">
        <span className="font-display text-fluid-18 font-bold">{heroLabel(manager, isLeader)}</span>
        <span className="text-dim">·</span>
        <span className="text-[15px] font-semibold">{manager.archetype}</span>
      </div>
      {isManOfTheMatch(manager, isLeader) && (
        <span className="mt-1 text-[14px] text-dim">Top of the table, and still on this list.</span>
      )}
      <p className="mt-4 font-display text-fluid-27 font-semibold">{manager.roast}</p>
      <p className="nums mt-3 text-[14px] leading-[21px] text-dim">{numbersLine(manager)}</p>
      <Buttons manager={manager} leagueId={leagueId} tone="light" />
    </article>
  );
}

function Standard({
  manager,
  leagueId,
  motion,
}: {
  manager: Manager;
  leagueId: number;
  motion: Motion;
}) {
  const colour = cardFor(manager);
  return (
    <article className={`flex flex-col border-b border-line py-5 ${motion.className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="nums text-[13px] whitespace-pre text-muted">{metaLine(manager)}</span>
          <h3 className="font-display text-fluid-30 font-bold break-words">{manager.name}</h3>
          <span className="text-[15px] text-muted">{manager.teamName}</span>
        </div>
        <Rating manager={manager} size="standard" suffix={14} tone="text-muted" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <CardIcon colour={colour} size="standard" stamp={motion.stamp} />
        <span className="text-[16px] font-semibold">{manager.archetype}</span>
      </div>
      <p className="mt-3.5 text-[16px] leading-[25px]">{manager.roast}</p>
      <p className="nums mt-2.5 text-[14px] leading-[21px] text-muted">{numbersLine(manager)}</p>
      <Buttons manager={manager} leagueId={leagueId} tone="dark" />
    </article>
  );
}

function Compact({ manager, motion }: { manager: Manager; motion: Motion }) {
  return (
    <div className={`flex min-h-24 flex-col gap-2 border-b border-line py-3.5 ${motion.className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CardIcon colour={cardFor(manager)} size="compact" stamp={motion.stamp} />
          <span className="nums text-[13px] text-muted">{ordinal(manager.rank)}</span>
          <span className="truncate text-[15px] font-semibold">{manager.name}</span>
        </div>
        <Rating manager={manager} size="compact" suffix={12} tone="text-muted" />
      </div>
      <p className="nums text-[14px] leading-5">
        {manager.optedOut ? manager.roast : shortLine(manager)}
      </p>
    </div>
  );
}

/** Rating sizes by card: 72, 46 and 26px at full width, smaller on small phones. */
const RATING_SIZE = {
  hero: "text-fluid-72",
  standard: "text-fluid-46",
  compact: "text-fluid-26",
} as const;

/** The rating out of 10. An opted-out manager is not rated, so the slot stays empty. */
function Rating({
  manager,
  size,
  suffix,
  tone,
}: {
  manager: Manager;
  size: keyof typeof RATING_SIZE;
  suffix: number;
  tone: string;
}) {
  if (manager.optedOut) return null;
  return (
    <div className="flex flex-none items-baseline gap-[3px]">
      <span className={`nums font-display font-bold ${RATING_SIZE[size]}`}>
        {ratingFor(manager)}
      </span>
      <span className={tone} style={{ fontSize: `${suffix}px` }}>
        /10
      </span>
    </div>
  );
}

/** Copy, share and the report link. Share hands the portrait image to the OS sheet where there is one. */
function Buttons({
  manager,
  leagueId,
  tone,
}: {
  manager: Manager;
  leagueId: number;
  tone: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);
  if (manager.optedOut) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(manager.roast);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const share = async () => {
    const cardUrl = `${window.location.origin}/api/card/${leagueId}/${manager.entry}`;
    const payload = {
      title: `${manager.name} · Sent Off`,
      text: manager.roast,
      url: `${window.location.origin}/league/${leagueId}`,
    };
    try {
      if (navigator.share) await navigator.share(payload);
      else await navigator.clipboard.writeText(`${payload.text} ${cardUrl}`);
    } catch {
      // A cancelled share sheet is not an error worth showing.
    }
  };

  const secondary =
    tone === "light"
      ? "border-edge-light bg-transparent text-bg"
      : "border-edge bg-transparent text-text";
  const primary =
    tone === "light" ? "border-bg bg-bg text-text" : "border-text bg-text text-bg";

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {/* Both labels sit in the same cell and crossfade, so the button never changes width. */}
        <button
          type="button"
          onClick={copy}
          className={`grid h-11 place-items-center rounded-card border text-[15px] font-semibold ${secondary}`}
        >
          <span
            aria-hidden={copied}
            className={`col-start-1 row-start-1 transition-opacity duration-150 ${copied ? "opacity-0" : ""}`}
          >
            Copy roast
          </span>
          <span
            aria-hidden={!copied}
            className={`col-start-1 row-start-1 transition-opacity duration-150 ${copied ? "" : "opacity-0"}`}
          >
            Copied
          </span>
        </button>
        <button
          type="button"
          onClick={share}
          className={`h-11 rounded-card border text-[15px] font-semibold ${primary}`}
        >
          Share
        </button>
      </div>
      <a
        href={reportRoastUrl(leagueId, manager.entry, manager.roast)}
        target="_blank"
        rel="noreferrer noopener"
        className={`mt-3 self-start text-[13px] underline underline-offset-4 ${
          tone === "light" ? "text-dim" : "text-muted"
        }`}
      >
        Report this roast
      </a>
    </>
  );
}
