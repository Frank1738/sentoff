"use server";

// The one form action on the site: turn whatever was pasted into a route. Parsing stays
// server side so nothing under app/ pulls lib/fpl.ts into a client bundle.
import { redirect } from "next/navigation";
import { parseId } from "@/lib/fpl";

/** True when the text names a team or entry rather than a league, so the picker is the right page. */
function looksLikeTeam(text: string): boolean {
  return /\b(entry|team)\b/i.test(text) && !/\bleagues?\b/i.test(text);
}

/**
 * Sends a pasted league ID, league URL or team ID to the page that can handle it. A bare
 * number is treated as a league; if FPL has no such league, that page offers the team route.
 */
export async function go(formData: FormData): Promise<void> {
  const raw = formData.get("league");
  const text = typeof raw === "string" ? raw : "";
  const id = parseId(text);
  if (id === null) redirect("/?bad=1");
  redirect(looksLikeTeam(text) ? `/team/${id}` : `/league/${id}`);
}
