// Awards strip: league-wide worsts plus the Wooden Spoon.
import type { CSSProperties } from "react";
import type { Award } from "@/lib/types";
import CardIcon from "./card-icon";
import type { CardColour } from "./card-rules";

/** Which colour card each award carries. The bench award is the only one that is merely careless. */
const COLOUR: Record<string, CardColour> = {
  "Golden Boot of Shame": "red",
  "Red Card": "red",
  "Benchwarmer of the Year": "yellow",
  "Wooden Spoon": "red",
};

/** The number the award is for, pulled back out of its own line so nothing is invented here. */
function headlineNumber(line: string): string | null {
  const match = line.match(/\d[\d,]*/);
  return match ? match[0] : null;
}

export default function Awards({
  awards,
  start,
  entered = false,
}: {
  awards: Award[];
  /** When the rows start drawing in, in ms. Leave unset for the stylesheet's default. */
  start?: number;
  /** True when the awards are already on screen, so the rows do not draw in again. */
  entered?: boolean;
}) {
  if (awards.length === 0) return null;
  const listStyle =
    start === undefined ? undefined : ({ "--stack-start": `${start}ms` } as CSSProperties);
  return (
    <section aria-labelledby="h-awards" className="border-t border-line px-5 pt-[18px] pb-[14px] wide:mx-5 wide:px-0 lg:mx-0 lg:pt-4 lg:pb-2">
      <h2 id="h-awards" className={`mb-1 text-fluid-17 font-semibold ${entered ? "" : "enter-8"}`}>
        Awards
      </h2>
      <ul className={`list-none p-0 ${entered ? "" : "stack-reveal"}`} style={listStyle}>
        {awards.map((award, index) => {
          const value = headlineNumber(award.line);
          return (
            <li
              key={`${award.title}-${award.entry}`}
              className="flex items-start gap-3 border-b border-line py-3 lg:py-2.5"
              style={{ "--row": index } as CSSProperties}
            >
              <CardIcon colour={COLOUR[award.title] ?? "yellow"} size="award" className="mt-0.5" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{award.title}</span>
                <span className="text-[14px] text-muted">{award.line}</span>
              </div>
              {value !== null && (
                <span className="nums font-display text-fluid-24 font-bold whitespace-nowrap">
                  {value}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
