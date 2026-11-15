// The bits of furniture every page shares: the logo, the report header and a plain notice screen.
import Link from "next/link";
import { enterClass } from "@/lib/motion";
import { DEMO_LEAGUE } from "./site";

/** The red card mark plus the name. With `enter`, the name enters first and the mark stamps in at 600ms. */
export function Logo({ enter = false }: { enter?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${enter ? "enter-0" : ""}`}>
      <span
        aria-hidden="true"
        className={`block h-[21px] w-[15px] rounded-[2px] bg-red ${
          enter ? "stamp [--stamp-delay:600ms]" : ""
        }`}
      />
      <span className="font-display text-[20px] leading-none font-bold">Sent Off</span>
    </div>
  );
}

/** The top of a league page: where it came from, which gameweek, the league, the count. */
export function ReportHeader({
  leagueId,
  leagueName,
  gameweek,
  managerCount,
  entered = false,
  children,
}: {
  leagueId: number;
  leagueName: string;
  gameweek: number;
  managerCount?: number;
  /** True when the header is already on screen, so nothing enters again. */
  entered?: boolean;
  /** The progress block, while the report is still being built. */
  children?: React.ReactNode;
}) {
  const enter = (index: number) => (entered ? "" : enterClass(index));
  return (
    <header className="flex flex-col px-5 pt-4 pb-6 lg:px-0 lg:pb-[22px]">
      <Link
        href="/"
        className={`flex min-h-11 items-center self-start text-[15px] text-muted no-underline ${enter(0)}`}
      >
        ← New league
      </Link>
      <p className={`mt-3.5 text-[14px] text-muted ${enter(1)}`}>
        Match report, after Gameweek {gameweek}
      </p>
      <h1 className={`mt-1.5 font-display text-fluid-46 font-bold break-words ${enter(2)}`}>
        {leagueName}
      </h1>
      <p className={`nums mt-2.5 text-[14px] text-muted ${enter(3)}`}>
        {managerCount === undefined
          ? `League ${leagueId}`
          : `${managerCount} managers rated · League ${leagueId}`}
      </p>
      {children}
    </header>
  );
}

/**
 * A full-page message: no such league, private, busy. Plain words only, never a stack trace.
 * `action` is the way out, which is always a link back to an input.
 */
export function Notice({
  title,
  body,
  action,
  children,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pt-7 pb-8">
      <Logo />
      <h1 className="mt-[120px] font-display text-fluid-38 font-bold">{title}</h1>
      <div className="mt-6 flex flex-col gap-3.5">
        <p role="alert" className="flex items-start gap-3 text-[15px] leading-[23px]">
          <span
            role="img"
            aria-label="Yellow card"
            className="mt-0.5 block h-[19px] w-[14px] flex-none rounded-[2px] border border-bg/45 bg-yellow"
          />
          <span>{body}</span>
        </p>
        {children}
        {action && (
          <Link
            href={action.href}
            className="mt-1.5 flex h-14 items-center justify-center rounded-card bg-red text-[17px] font-semibold text-bg no-underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      <Link
        href={`/league/${DEMO_LEAGUE}`}
        className="mt-auto flex min-h-11 items-center self-start text-[15px] font-medium underline-offset-4"
      >
        Try a demo league
      </Link>
    </main>
  );
}
