// Share image for one card. Cache read only.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { GenericCard, PORTRAIT, PortraitCard } from "@/components/share-card";
import { siteHost } from "@/components/site";
import { parseId } from "@/lib/fpl";
import { cachedReport } from "@/lib/report";

/** A share image never changes once a report is built, so the edge can hold it for a day. */
const CACHE_CONTROL = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";

const zillaSlab = await readFile(join(process.cwd(), "assets/ZillaSlab-Bold.ttf"));

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/card/[id]/[entry]">,
): Promise<Response> {
  const { id, entry } = await ctx.params;
  const leagueId = parseId(id);
  const entryId = parseId(entry);
  const host = siteHost();

  const fonts = [{ name: "Zilla Slab", data: zillaSlab, weight: 700 as const, style: "normal" as const }];
  const generic = () =>
    new ImageResponse(<GenericCard width={PORTRAIT.width} height={PORTRAIT.height} host={host} />, {
      ...PORTRAIT,
      fonts,
      headers: { "Cache-Control": CACHE_CONTROL },
    });

  if (leagueId === null || entryId === null) return generic();

  // Read only: a crawler hitting this route must never start a build.
  const report = await cachedReport(leagueId);
  const manager = report?.managers.find((candidate) => candidate.entry === entryId);
  if (!report || !manager || manager.optedOut) return generic();

  const isLeader = manager.rank === Math.min(...report.managers.map((m) => m.rank));
  return new ImageResponse(
    <PortraitCard manager={manager} isLeader={isLeader} host={host} leagueId={leagueId} />,
    {
      ...PORTRAIT,
      fonts,
      // Emoji in a team or manager name render as images rather than missing glyphs.
      emoji: "noto",
      headers: { "Cache-Control": CACHE_CONTROL },
    },
  );
}
