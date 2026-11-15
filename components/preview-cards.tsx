// The two sample cards beside the home page form on desktop, from board 05 of the design: a light
// hero card and a dark standard card, overlapping and tilted a degree and a half each way. They are
// real cards with sample data, so they always match the report. Inert: nothing in them can be
// tabbed to or read out, they are a picture of the output. They enter last, flat (no blur) and
// rising 14px, after the form has settled.
import type { Manager } from "@/lib/types";
import ManagerCard from "./manager-card";
import { DEMO_LEAGUE } from "./site";

/** The leader: man of the match with a template team. No card, rated 7. */
const SAM: Manager = {
  entry: 1,
  name: "Sam",
  teamName: "Haaland Oates",
  rank: 1,
  lastRank: 1,
  totalPoints: 742,
  archetype: "The Sheep",
  roast: "Congratulations on winning the same way as four million other people.",
  facts: [
    { key: "sheep_index", headline: "93% average ownership across his XI", value: 93, sting: 31 },
    { key: "cucumber", headline: "0 differentials", value: 0, sting: 12 },
  ],
  optedOut: false,
};

/** Seventh, down two, with a bench outscoring his first team. Yellow card, rated 4. */
const DAVE: Manager = {
  entry: 2,
  name: "Dave",
  teamName: "Salah Deal",
  rank: 7,
  lastRank: 5,
  totalPoints: 688,
  archetype: "The Bench Warmer",
  roast:
    "Dave has left 47 points on the bench this season, which is more than Sam’s starting eleven managed in October. His subs have a better record than his first team and, judging by GW7, know it.",
  facts: [
    { key: "bench_burner", headline: "47 bench points, a league high", value: 47, sting: 64 },
    { key: "bench_burner", headline: "GW7: bench 23, starting XI 19", value: 23, sting: 40 },
  ],
  optedOut: false,
};

export default function PreviewCards() {
  return (
    <div
      inert
      aria-hidden="true"
      className="relative hidden h-[520px] origin-top-left scale-[0.72] lg:block xl:h-[720px] xl:scale-100"
    >
      <div className="enter-flat-6 absolute top-6 left-6 w-[350px] -rotate-[1.5deg] [--enter-rise:14px] [&>article]:my-0">
        <ManagerCard manager={SAM} leagueId={DEMO_LEAGUE} size="hero" isLeader />
      </div>
      {/* The standard card is flat between rules in the report; here it needs its own edge where it overlaps. */}
      <div className="enter-flat-7 absolute top-[236px] left-[270px] w-[350px] rotate-[1.5deg] [--enter-rise:14px] rounded-card border border-line bg-bg px-5 [&>article]:border-b-0">
        <ManagerCard manager={DAVE} leagueId={DEMO_LEAGUE} size="standard" />
      </div>
    </div>
  );
}
