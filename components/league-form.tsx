"use client";

// The one input on the home page. Client only for the two states the design asks for:
// the yellow invalid border and the busy button label. Enters with the page in order:
// label and input (2), button (3), demo link and help line (4).
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { DEMO_LEAGUE } from "./site";

export default function LeagueForm({
  action,
  invalid = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** True after the action bounced back because nothing usable was pasted. */
  invalid?: boolean;
}) {
  return (
    <>
      <form action={action} className="mt-12 flex flex-col gap-2.5 lg:mt-10">
        <label htmlFor="league-input" className="enter-2 text-[15px] font-medium">
          League ID, league URL or team ID
        </label>
        <input
          id="league-input"
          name="league"
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="314159"
          aria-invalid={invalid}
          aria-describedby={invalid ? "league-error" : undefined}
          className={`nums enter-2 h-14 rounded-card border bg-raised px-4 text-[18px] text-text focus:border-text focus:outline-none ${
            invalid ? "border-2 border-yellow" : "border-edge"
          }`}
        />
        {invalid && (
          <p
            id="league-error"
            role="alert"
            className="enter-2 flex items-center gap-2.5 text-[14px] leading-5"
          >
            <span
              role="img"
              aria-label="Yellow card"
              className="block h-[19px] w-[14px] flex-none rounded-[2px] border border-bg/45 bg-yellow"
            />
            Paste a league ID, league URL or team ID first.
          </p>
        )}
        <Submit />
      </form>
      <div className="enter-4 mt-auto flex flex-col gap-2.5 lg:mt-3.5 lg:gap-1.5">
        <Link
          href={`/league/${DEMO_LEAGUE}`}
          className="flex min-h-11 items-center self-start text-[15px] font-medium underline-offset-4"
        >
          Try a demo league
        </Link>
        <p className="text-[14px] leading-5 text-muted">
          Your ID: Leagues &amp; Cups › your league › the number in the URL.
        </p>
      </div>
    </>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="enter-3 mt-1 h-14 rounded-card bg-red text-[17px] font-semibold text-bg"
    >
      {pending ? "Fetching the league…" : "Roast the league"}
    </button>
  );
}
