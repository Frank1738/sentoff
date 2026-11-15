// League report (server renders from cache; client streams if cold).
import type { Metadata } from "next";
import { Suspense } from "react";
import { Notice } from "@/components/chrome";
import LeagueStream from "@/components/league-stream";
import Loading from "@/components/loading";
import ReportView from "@/components/report-view";
import { parseId } from "@/lib/fpl";
import { cachedReport } from "@/lib/report";

export async function generateMetadata({ params }: PageProps<"/league/[id]">): Promise<Metadata> {
  const { id } = await params;
  const leagueId = parseId(id);
  return {
    title: leagueId === null ? "Sent Off" : `League ${leagueId} · Sent Off`,
    description: "Every manager in your mini-league, rated. Built from public FPL data.",
  };
}

export default function LeaguePage({ params, searchParams }: PageProps<"/league/[id]">) {
  return (
    <Suspense fallback={<Shell />}>
      <Body params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * A cache hit renders the whole report here. A miss renders the shell and hands over to the
 * client, which streams the build from /api/league/[id].
 */
async function Body({
  params,
  searchParams,
}: {
  params: PageProps<"/league/[id]">["params"];
  searchParams: PageProps<"/league/[id]">["searchParams"];
}) {
  const { id } = await params;
  const leagueId = parseId(id);
  if (leagueId === null) {
    return (
      <Notice
        title="No such league."
        body="A league ID is a plain number. Check the number after /leagues/ in your league's URL."
        action={{ href: "/", label: "Try again" }}
      />
    );
  }

  const { you } = await searchParams;
  const viewer = parseId(typeof you === "string" ? you : null) ?? undefined;

  const report = await cachedReport(leagueId);
  if (report) return <ReportView report={report} you={viewer} />;
  return <LeagueStream leagueId={leagueId} you={viewer} />;
}

/** The prerendered shell: the furniture, with the counter at nothing read yet. It enters like the loading header, so the swap to the real one barely restarts it. */
function Shell() {
  return (
    <main className="mx-auto w-full max-w-[430px] pb-10 lg:flex lg:max-w-[1200px] lg:items-start lg:justify-center lg:gap-24 lg:px-10">
      <header className="flex flex-col px-5 pt-4 pb-6 lg:w-[420px] lg:flex-none lg:px-0">
        <p className="enter-0 mt-3.5 text-[14px] text-muted">Match report</p>
        <h1 className="enter-1 mt-1.5 font-display text-fluid-46 font-bold">Reading the league</h1>
        <Loading done={0} total={0} />
      </header>
      <div className="hidden lg:block lg:w-[430px] lg:flex-none" />
    </main>
  );
}
