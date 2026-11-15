// Standings strip, shown straight after the one standings request.
import type { CSSProperties } from "react";
import { moveLabel } from "./card-rules";

/** One table row. The strip renders from the standings call, before any manager has been read. */
export interface StandingsRow {
  entry: number;
  name: string;
  rank: number;
  lastRank: number;
  totalPoints: number;
}

/** Ranks always shown. Everything between them collapses to one dots row. */
const SHOWN = [1, 2, 3, 18, 19, 20];

/** The rows the table shows, dots rows included, so the awards can time their entrance from the count. */
export function tableRows(
  managers: StandingsRow[],
  you?: number,
): Array<{ gap: boolean; row?: StandingsRow }> {
  const byRank = [...managers].sort((a, b) => a.rank - b.rank);
  const ranks = new Set(SHOWN.filter((rank) => rank <= byRank.length));
  for (const rank of byRank.slice(0, 3).map((row) => row.rank)) ranks.add(rank);
  const mine = you ? byRank.find((row) => row.entry === you) : undefined;
  if (mine) ranks.add(mine.rank);

  const shown = [...ranks].sort((a, b) => a - b);
  const rows: Array<{ gap: boolean; row?: StandingsRow }> = [];
  shown.forEach((rank, index) => {
    const previous = shown[index - 1];
    if (previous !== undefined && rank - previous > 1) rows.push({ gap: true });
    const row = byRank.find((candidate) => candidate.rank === rank);
    if (row) rows.push({ gap: false, row });
  });
  return rows;
}

export default function Standings({
  managers,
  you,
  start,
  entered = false,
}: {
  managers: StandingsRow[];
  /** The visitor's own entry, known only when they arrived from a team ID. */
  you?: number;
  /** When the rows start drawing in, in ms. Leave unset for the stylesheet's default. */
  start?: number;
  /** True when the table is already on screen, so the rows do not draw in again. */
  entered?: boolean;
}) {
  const rows = tableRows(managers, you);
  const listStyle =
    start === undefined ? undefined : ({ "--stack-start": `${start}ms` } as CSSProperties);

  return (
    <section aria-labelledby="h-table" className="border-t border-line px-5 pt-[18px] pb-[22px] wide:mx-5 wide:px-0 lg:mx-0 lg:pt-4 lg:pb-[18px]">
      <h2 id="h-table" className={`mb-2 text-fluid-17 font-semibold ${entered ? "" : "enter-4"}`}>
        Table
      </h2>
      <ol className={`list-none p-0 ${entered ? "" : "stack-reveal"}`} style={listStyle}>
        {rows.map((item, index) =>
          item.gap || !item.row ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: the dots row has no identity of its own
            <li
              key={`gap-${index}`}
              data-gap=""
              aria-hidden="true"
              className="flex h-[22px] pl-0.5 text-[15px] text-muted"
              style={{ "--row": index } as CSSProperties}
            >
              <span>⋮</span>
            </li>
          ) : (
            <li
              key={item.row.entry}
              className={`nums grid min-h-10 lg:min-h-9 grid-cols-[30px_minmax(0,1fr)_44px_52px] items-center border-b border-line px-2 ${
                item.row.entry === you ? "bg-raised" : ""
              }`}
              style={{ "--row": index } as CSSProperties}
            >
              <span className="text-[15px] text-muted">{item.row.rank}</span>
              <span className={`truncate text-[15px] ${item.row.entry === you ? "font-semibold" : ""}`}>
                {item.row.name}
                {item.row.entry === you ? " (you)" : ""}
              </span>
              <span className="text-[13px] text-muted">{moveLabel(item.row.rank, item.row.lastRank)}</span>
              <span className="text-right text-[15px]">{item.row.totalPoints}</span>
            </li>
          ),
        )}
      </ol>
    </section>
  );
}
