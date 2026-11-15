// Home: one input (league ID, FPL URL, or team ID). From 1024px wide the form sits in a left
// column with two sample cards beside it, from board 05 of the design.
import { Suspense } from "react";
import { Logo } from "@/components/chrome";
import LeagueForm from "@/components/league-form";
import PreviewCards from "@/components/preview-cards";
import { go } from "./actions";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pt-7 pb-8 lg:grid lg:max-w-[1200px] lg:grid-cols-[420px_minmax(0,1fr)] lg:items-center lg:gap-x-16 lg:px-10 lg:py-0 xl:grid-cols-[480px_minmax(0,1fr)] xl:gap-x-20">
      <div className="lg:absolute lg:top-8 lg:left-10">
        <Logo enter />
      </div>
      <div className="flex flex-1 flex-col lg:flex-none">
        <h1 className="enter-1 mt-[150px] font-display text-fluid-48 font-bold lg:mt-0 lg:text-[48px] lg:leading-[1.02] xl:text-[56px]">
          Every manager in your mini-league, rated.
        </h1>
        <Suspense fallback={<LeagueForm action={go} />}>
          <Form searchParams={searchParams} />
        </Suspense>
        <Steps />
      </div>
      <PreviewCards />
    </main>
  );
}

/** Reads the one query param the action bounces back, so the form can show the invalid state. */
async function Form({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { bad } = await searchParams;
  return <LeagueForm action={go} invalid={bad === "1"} />;
}

/** The three steps under the form. Desktop only: the phone screen is already full. */
function Steps() {
  return (
    <ol className="enter-5 nums mt-8 hidden list-none justify-between gap-4 border-t border-line p-0 pt-[18px] text-[14px] whitespace-nowrap text-muted lg:flex">
      {["Paste your league ID", "We read every manager", "Share the roast"].map((step, index) => (
        <li key={step} className="flex gap-1.5">
          <span className="font-semibold text-text">{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
