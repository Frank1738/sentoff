// The finished league report. Rendered on the server for a cached league and by the
// client stream once a cold build has sent its last line, so both look identical.
// One column on a phone; from 1024px the header, table and awards stick on the left
// while the ratings scroll on the right, from board 06 of the design.
import { stackEnd } from "@/lib/motion";
import type { Report } from "@/lib/types";
import Awards from "./awards";
import { ReportHeader } from "./chrome";
import Ratings from "./ratings";
import Standings, { tableRows } from "./standings";
import StickyColumn from "./sticky-column";

/** The table draws in from here, after the header's four lines; the awards follow its last row. */
const TABLE_START = 300;
const AWARDS_AFTER_TABLE = 100;

export default function ReportView({
  report,
  you,
  entered = false,
}: {
  report: Report;
  you?: number;
  /** True when the stream hands over with the cards already on screen, so nothing enters again. */
  entered?: boolean;
}) {
  const awardsStart =
    stackEnd(TABLE_START, tableRows(report.managers, you).length) + AWARDS_AFTER_TABLE;
  return (
    <main className="mx-auto w-full max-w-[430px] pb-10 lg:flex lg:max-w-[1200px] lg:items-start lg:justify-center lg:gap-24 lg:px-10">
      <StickyColumn>
        <ReportHeader
          leagueId={report.leagueId}
          leagueName={report.leagueName}
          gameweek={report.gameweek}
          managerCount={report.managers.length}
          entered={entered}
        />
        <Standings managers={report.managers} you={you} start={TABLE_START} entered={entered} />
        <Awards awards={report.awards} start={awardsStart} entered={entered} />
      </StickyColumn>
      <div className="lg:w-[430px] lg:flex-none">
        <Ratings
          managers={report.managers}
          leagueId={report.leagueId}
          gameweek={report.gameweek}
          entered={entered}
        />
      </div>
    </main>
  );
}
