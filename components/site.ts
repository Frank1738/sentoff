// Where this copy of the app lives, and where a bad roast gets reported. No secrets here.

/** The repo the "report this roast" link opens an issue against. */
export const ISSUES_URL = "https://github.com/Frank1738/sentoff/issues/new";

/** The league behind the "try a demo" links: the public one the test fixture was captured from. */
export const DEMO_LEAGUE = 1500;

/**
 * The public origin, used for share links and the share image's footer. Set
 * `NEXT_PUBLIC_SITE_URL` in production; on Vercel the deployment URL is the fallback.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** The host on its own, for the line baked into a share image. */
export function siteHost(): string {
  return siteUrl().replace(/^https?:\/\//, "");
}

/** A league's public page. */
export function leagueUrl(leagueId: number): string {
  return `${siteUrl()}/league/${leagueId}`;
}

/**
 * A prefilled GitHub issue about one roast. Everything user-supplied is encoded, so a roast
 * full of punctuation cannot break out of the URL.
 */
export function reportRoastUrl(leagueId: number, entry: number, roast: string): string {
  const title = `Roast report: league ${leagueId}, entry ${entry}`;
  const body = [
    `League: ${leagueId}`,
    `Entry: ${entry}`,
    "",
    "Roast:",
    roast,
    "",
    "What is wrong with it:",
  ].join("\n");
  return `${ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
