// Link preview. Cache read only.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { topSting } from "@/components/card-rules";
import { GenericCard, LANDSCAPE, LandscapeCard } from "@/components/share-card";
import { siteHost } from "@/components/site";
import { parseId } from "@/lib/fpl";
import { cachedReport } from "@/lib/report";

export const alt = "Sent Off league report";
export const size = LANDSCAPE;
export const contentType = "image/png";

const zillaSlab = await readFile(join(process.cwd(), "assets/ZillaSlab-Bold.ttf"));

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Response> {
  const { id } = await params;
  const leagueId = parseId(id);
  const host = siteHost();
  const fonts = [
    { name: "Zilla Slab", data: zillaSlab, weight: 700 as const, style: "normal" as const },
  ];

  // Read only: the preview of an unbuilt league is the branded card, never a build.
  const report = leagueId === null ? null : await cachedReport(leagueId);
  const worst = report?.managers
    .filter((manager) => !manager.optedOut)
    .reduce<(typeof report.managers)[number] | null>(
      (held, manager) => (held === null || topSting(manager) > topSting(held) ? manager : held),
      null,
    );

  if (!report || !worst || leagueId === null) {
    return new ImageResponse(<GenericCard width={size.width} height={size.height} host={host} />, {
      ...size,
      fonts,
    });
  }

  const isLeader = worst.rank === Math.min(...report.managers.map((manager) => manager.rank));
  return new ImageResponse(
    <LandscapeCard manager={worst} isLeader={isLeader} host={host} leagueId={leagueId} />,
    { ...size, fonts, emoji: "noto" },
  );
}
