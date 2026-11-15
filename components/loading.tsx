// Progress counter while manager data is fetched ("Reading 14 of 20"), and the header above it.
// Both enter with the page: league number (0), name (1), progress block (2).

/**
 * The top of the waiting screen, from the loading board: the league number, the name at 36px, a
 * rule underneath. Smaller than the report header and with no way back, because the build is
 * already running.
 */
export function LoadingHeader({
  leagueId,
  leagueName,
  children,
}: {
  leagueId: number;
  leagueName: string;
  /** The progress block. */
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col border-b border-line px-5 pt-6 pb-4 wide:mx-5 wide:px-0 lg:mx-0 lg:border-b-0 lg:pt-[76px]">
      <p className="enter-0 nums text-[14px] text-muted">League {leagueId}</p>
      <h1 className="enter-1 mt-1 font-display text-fluid-36 font-bold break-words">{leagueName}</h1>
      {children}
    </header>
  );
}

export default function Loading({
  done,
  total,
  rated = 0,
  note,
  paused = false,
}: {
  done: number;
  total: number;
  /** Cards that have landed. Roasts are written after every manager has been read. */
  rated?: number;
  /** The line under the bar: what the build is doing, or why it stopped. */
  note?: string;
  paused?: boolean;
}) {
  const all = total > 0 && done >= total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const heading = paused
    ? `Paused at ${done} of ${total || 20}`
    : all
      ? `All ${total} managers read`
      : `Reading ${done} of ${total || 20}`;

  return (
    <div role="status" aria-live="polite" className="enter-2 mt-3.5 flex flex-col gap-2">
      <div className="nums flex items-baseline justify-between">
        <span className="text-[15px] font-semibold">{heading}</span>
        <span className="text-[14px] text-muted">{rated} rated</span>
      </div>
      <div aria-hidden="true" className="h-0.5 bg-line">
        <div
          className={`bar h-0.5 ${paused ? "bg-yellow" : "bg-text"}`}
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
      <p className="mt-0.5 min-h-11 text-[15px] leading-[22px]">
        {note ?? (all ? "That will do." : "Reading the league.")}
      </p>
    </div>
  );
}
