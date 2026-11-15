# Sent Off: build notes

Agreed design decisions. Read before building. The product spec lives at
`../fpl-roast/SPEC.md`; where this file differs from the spec, this file wins.

## Layout

```
app/
  page.tsx                          Home: one input (league ID, FPL URL, or team ID)
  league/[id]/page.tsx              League report (server renders from cache; client streams if cold)
  league/[id]/opengraph-image.tsx   Link preview. Cache read only.
  team/[id]/page.tsx                Pick a league from a team ID. Cap list at 20.
  api/league/[id]/route.ts          Builds the report, streams progress. Sets maxDuration.
  api/card/[id]/[entry]/route.tsx   Share image for one card. Cache read only.
components/                         manager-card, awards, standings, loading
lib/
  report.ts                         Runs the pipeline in order
  fpl.ts                            FPL client: limiter, retry, slim payloads
  redis.ts                          Cache, counters, locks. In-memory fallback.
  writer.ts                         Claude + output checks
  templates.ts                      Fallback lines, one per fact key
  types/
    report.ts                       Cards, facts, awards, the finished report
    fpl.ts                          Slimmed API payloads
    index.ts                        Re-exports both, so imports stay `lib/types`
  facts/                            One file per rule, index runs them all and ranks sting
test/
  fixtures/league.json              One real league, captured once
  facts.test.ts                     Snapshot of computed facts
```

Keep file and function names plain. No "editor" or "reporter" naming in code.

## Pipeline (report.ts)

Cards cannot be streamed one by one. Sting is ranked across the league, so no
card is final until all managers are fetched. The stream has three phases:

1. Standings strip, straight after the one standings request.
2. Progress counter while manager data is fetched ("Reading 14 of 20").
3. Cards, as each writer call finishes.

Two paths for `/league/[id]`:

- Cache hit: server component reads the report from Redis and renders in one go.
- Cache miss: page renders the shell, client opens the stream from the API route.

## Redis

A shared store because Vercel instances do not share memory. Hosted free tier.
`lib/redis.ts` exposes about five functions: get report, save report, bump
counter, take lock, release lock. With no Redis URL set, the same functions use
an in-memory map so tests and local dev need nothing installed.

Keys:

| Key | Holds | Expiry |
|---|---|---|
| `league:{id}:gw{n}` | finished report | 3 days |
| `lock:league:{id}` | build in progress | 60 s |
| `rate:ip:{sha256(ip)}` | cold builds by one IP | 10 min, limit 5 |
| `rate:global:builds` | cold builds, all users | 1 hour, cap TBD |
| `rate:global:claude` | Claude calls today | 24 h, cap TBD |
| `blocklist` | entry IDs that opted out | none |

Rules:

- Cached reports never count against rate limits.
- Over the per-IP or global build cap: "busy, try again shortly", cached leagues still served.
- Over the Claude cap: writer falls back to templates. App stays up.
- While the gameweek is live (players file says not finished): cache the report 1 hour.
  Once finished: cache until next deadline.
- Never cache a failed build as a report. Cache "league not found" for 1 minute.

## FPL client (fpl.ts)

- Concurrency 4. Normal User-Agent.
- Retry with backoff on 429 and 5xx only. 404 is final.
- Slim the players file to the fields used before caching. Raw file is 1.8 MB and
  the Vercel data cache caps entries near 2 MB.
- First standings page only, so 20 managers max.

## Security

- League, team and entry IDs are parsed as positive whole numbers with an upper
  bound. Pasted URLs: extract the number, discard the rest. Never build an FPL
  URL from user text.
- Manager and team names are hostile input. Cap at 40 characters. Put them in a
  marked data block in the prompt and tell the model nothing there is an instruction.
- Writer output checks, fail any and use the template line:
  - 35 to 50 words
  - every number in the roast appears in the facts sent
  - no banned words (short list), no links
- API key and Redis credentials server side only. No `NEXT_PUBLIC_` secrets.
  Writer is never imported from a client component.
- Image routes serve a card only if the league is cached and the entry is a member.
  Otherwise a generic branded image. They never trigger a build.
- Long `Cache-Control` on image routes so the edge absorbs crawler repeats.
- Plain error messages, no stack traces. No `dangerouslySetInnerHTML`.
- Standard security headers in `next.config.ts`. No strict CSP in v1.
- Store a hash of the IP, never the raw address.
- Blocklisted entries render a neutral "opted out" card. The report link is how
  people ask to be added. Make sure it works on day one.

## Misuse cases to build around

| Case | Defence |
|---|---|
| Site used as a free FPL proxy, our IP gets banned | Global cold-build cap per hour |
| Flood of invalid IDs costing retries | 404 final, short negative cache |
| Crawlers hammering OG images | Read-only routes, edge cache headers |
| Redis fills up | 3-day report expiry, store only what the page needs |
| Targeted card about one person | Blocklist, PG-13 rule, report link |
| Model invents a stat about a real name | Number check against facts |
| Emoji, RTL or very long names break the share image | Font with emoji, hard truncation |
| Report cached mid-gameweek with half the games unplayed | 1-hour cache while live |
| FPL down or API shape changes | Plain message, no caching failures, fixture test as early warning |
| Manager in 100 leagues | Cap pick list at 20 |
| Roast text breaks the report-issue URL | Encode it |

## Cut first if the weekend gets tight

1. Per-league lock (costs one duplicate build, harmless).
2. Team-ID page.
