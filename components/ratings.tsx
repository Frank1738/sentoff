// The "Player ratings" section: one card per manager in rank order, compacts grouped two across.
import type { Manager } from "@/lib/types";
import { type CardSize, sizesFor } from "./card-rules";
import ManagerCard from "./manager-card";

/** The heading enters at this step; the cards follow, one step per visual row. */
const HEADING_ENTER = 2;
/** Visual rows of cards that enter with the page. The rest are below the fold and just render. */
const ENTERING_ROWS = 6;

export default function Ratings({
  managers,
  leagueId,
  gameweek,
  arrivingEntry,
  entered = false,
  footer = true,
}: {
  managers: Manager[];
  leagueId: number;
  gameweek: number;
  /** The entry whose card has just streamed in, so only that one animates. */
  arrivingEntry?: number;
  /** True when the cards are already on screen, so nothing enters again. */
  entered?: boolean;
  footer?: boolean;
}) {
  const byRank = [...managers].sort((a, b) => a.rank - b.rank);
  const sizes = sizesFor(byRank);
  const leader = byRank[0]?.entry;

  // Runs of compact cards share one two-column grid; anything bigger breaks the run.
  const blocks: Array<{ size: CardSize; items: Manager[] }> = [];
  for (const manager of byRank) {
    const size = sizes.get(manager.entry) ?? "compact";
    const last = blocks[blocks.length - 1];
    if (size === "compact" && last?.size === "compact") last.items.push(manager);
    else blocks.push({ size, items: [manager] });
  }

  // Each visual row enters one step after the last; both cards of a compact row share a step.
  const enterFor = (visualRow: number) =>
    entered || visualRow >= ENTERING_ROWS ? undefined : HEADING_ENTER + 1 + visualRow;
  let row = 0;

  return (
    <section aria-labelledby="h-ratings" className="flex flex-col border-t border-line px-5 pt-[18px] wide:mx-5 wide:px-0 lg:mx-0 lg:border-t-0 lg:pt-6">
      <h2 id="h-ratings" className={`text-fluid-17 font-semibold ${entered ? "" : "enter-2"}`}>
        Player ratings
      </h2>
      {blocks.map((block) => {
        const first = row;
        row += block.size === "compact" ? Math.ceil(block.items.length / 2) : 1;
        return block.size === "compact" ? (
          <div
            key={`grid-${block.items[0]?.entry}`}
            className="grid grid-cols-2 gap-x-5 sm:grid-cols-2"
          >
            {block.items.map((manager, index) => (
              // The odd one out at the end of a run takes the whole row, so its rating lines up with
              // the full-width card below instead of floating mid-page beside an empty cell.
              <div
                key={manager.entry}
                className={isLastOdd(index, block.items.length) ? "col-span-2" : ""}
              >
                <ManagerCard
                  manager={manager}
                  leagueId={leagueId}
                  size="compact"
                  arriving={manager.entry === arrivingEntry}
                  enter={enterFor(first + Math.floor(index / 2))}
                />
              </div>
            ))}
          </div>
        ) : (
          block.items.map((manager) => (
            <ManagerCard
              key={manager.entry}
              manager={manager}
              leagueId={leagueId}
              size={block.size}
              isLeader={manager.entry === leader}
              arriving={manager.entry === arrivingEntry}
              enter={enterFor(first)}
            />
          ))
        );
      })}
      {footer && (
        <p className="mt-[18px] pb-10 text-[13px] leading-[19px] text-muted">
          Ratings are the pundit&rsquo;s and are final. Built from public FPL data after the GW
          {gameweek} deadline.
        </p>
      )}
    </section>
  );
}

/** True for the last card of a run with an odd count. */
function isLastOdd(index: number, count: number): boolean {
  return count % 2 === 1 && index === count - 1;
}
