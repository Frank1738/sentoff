// Pick a league from a team ID. Cap list at 20.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ordinal } from "@/components/card-rules";
import { Logo, Notice } from "@/components/chrome";
import { FplError, MAX_MANAGERS, getEntryLeagues, parseId } from "@/lib/fpl";

export const metadata: Metadata = {
  title: "Your leagues · Sent Off",
};

export default function TeamPage({ params }: PageProps<"/team/[id]">) {
  return (
    <Suspense fallback={<Shell />}>
      <Body params={params} />
    </Suspense>
  );
}

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

async function Body({ params }: { params: PageProps<"/team/[id]">["params"] }) {
  const { id } = await params;
  const teamId = parseId(id);
  if (teamId === null) {
    return (
      <Notice
        title="That is not a team ID."
        body="Your team ID is the number in the URL of your Points page."
        action={{ href: "/", label: "Try again" }}
      />
    );
  }

  let leagues: Awaited<ReturnType<typeof getEntryLeagues>>;
  try {
    leagues = await getEntryLeagues(teamId);
  } catch (error) {
    const missing = error instanceof FplError && error.notFound;
    return (
      <Notice
        title={missing ? "No such team." : "Could not read that team."}
        body={
          missing
            ? `FPL has no team ${teamId}. It is the number in the URL of your Points page.`
            : "FPL did not answer. Nothing is wrong with your team."
        }
        action={{ href: "/", label: "Try again" }}
      />
    );
  }

  if (leagues.length === 0) {
    return (
      <Notice
        title="No leagues to rate."
        body={`Team ${teamId} is not in a classic mini-league we can read.`}
        action={{ href: "/", label: "Try again" }}
      />
    );
  }

  const count = WORDS[leagues.length] ?? String(leagues.length);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pt-7 pb-8">
      <Logo />
      <h1 className="mt-[72px] font-display text-fluid-38 font-bold">
        Team {teamId} is in {count} league{leagues.length === 1 ? "" : "s"}.
      </h1>
      <p className="mt-2.5 text-[15px] text-muted">Pick one to rate.</p>
      <ul className="mt-6 flex list-none flex-col gap-2 p-0">
        {leagues.map((league) => (
          <li key={league.id}>
            <Link
              href={`/league/${league.id}?you=${teamId}`}
              className="flex min-h-16 items-center justify-between gap-3 rounded-card border border-line bg-raised px-3.5 py-3 no-underline"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[16px] font-semibold">{league.name}</span>
                <span className="nums text-[14px] text-muted">
                  {league.rank === null ? "Not ranked yet" : `You are ${ordinal(league.rank)}`}
                </span>
              </span>
              <span aria-hidden="true" className="text-[18px] text-muted">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3.5 text-[14px] leading-5 text-muted">
        The first {MAX_MANAGERS} leagues only, and the first {MAX_MANAGERS} managers in each.
      </p>
    </main>
  );
}

function Shell() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pt-7 pb-8">
      <Logo />
      <h1 className="mt-[72px] font-display text-fluid-38 font-bold">
        Finding your leagues
      </h1>
    </main>
  );
}
