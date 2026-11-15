# Sent Off: build phases

Four layers, built bottom up. One phase per session. NOTES.md wins over the
spec where they differ. The stub tree already exists: keep its layout, file
names and export shapes unless a phase says otherwise.

## Rules for every phase

- Do only the phase named in the prompt. Layers above it stay as stubs.
  Layers below it are done; edit them only to fix a bug you can show.
- Keep names plain. No "editor", "reporter", "service" or "manager" classes.
- No new dependencies without asking.
- Secrets stay server side. Nothing under `app/` imports `lib/writer.ts`,
  `lib/fpl.ts` or `lib/redis.ts` from a client component.
- Every function that was a stub gets a real body, and its one-line comment
  is kept accurate.
- Finish with `npm run build` and `npm test` passing. Show `git diff --stat`.
- Do not commit. Stop and wait for review.

## Phase 1: Fetch

Files: `lib/fpl.ts`, `lib/types.ts`, `test/fixtures/league.json`, `test/fpl.test.ts` (new).

Goal: one client that gets everything a league needs from the FPL API.
Nothing else in the app knows an FPL URL.

- Replace the `ManagerData` and `LeagueData` placeholders in `lib/types.ts`
  with real types for the slimmed payloads. Only fields the facts need. Note
  the API field each came from.
- ID parsing: positive whole numbers with an upper bound. A pasted URL gives
  up its number and nothing else. Never build a URL from user text.
- Limiter at concurrency 4. Retry with backoff on 429 and 5xx only. 404 is
  final. Normal User-Agent.
- Slim the players file before caching. First standings page only, 20 managers.
- Capture one real league into `test/fixtures/league.json` with a one-off
  script, then delete the script. Say which league and gameweek.
- Tests: ID parsing, limiter, retry, all against a mocked fetch. No live calls.

Done when: fixture captured, types real, tests green, no other layer touched.

## Phase 2: Facts

Files: `lib/facts/*.ts`, `lib/facts/index.ts`, `test/facts.test.ts`.

Goal: pure functions over the fixture. No fetch, no env vars, no Redis.

- One rule per file, as stubbed. Each returns a `Fact`. The one-line comment
  next to each function states what is summed, over which GWs, from which field.
- Sting is 0 to 100 and follows the "sting rises when" column in the spec.
- `index.ts` computes all facts for a manager, ranks sting across the league,
  picks the archetype from the top fact, and returns the four awards.
- Names from the API are capped at 40 characters here, before anything
  downstream sees them.
- Tests: snapshot of all computed facts over the fixture, plus one hand-built
  case per rule that hits the sting threshold.

Done when: snapshot test green, every rule covered, `lib/facts` imports
nothing outside `lib/types.ts`.

## Phase 3: Writer and store

Files: `lib/templates.ts`, `lib/writer.ts`, `lib/redis.ts`, `test/writer.test.ts` (new).

Goal: facts in, roast out, with the app fully usable when no keys are set.

- `templates.ts` first: one fallback line per fact key, numbers filled from
  the fact. Used when there is no API key, the call fails, or the Claude cap
  is hit.
- `writer.ts`: Claude Haiku 5.5 via `@anthropic-ai/sdk`. System prompt rules
  from the spec: only the numbers given, British football banter, PG-13, no
  slurs, 35 to 50 words, end on the sharpest fact. Manager and team names go
  in a marked data block the model is told is not instructions.
- Output checks, fail any and use the template: 35 to 50 words, every number
  in the roast appears in the facts sent, no banned words, no links.
- `redis.ts`: the five functions as stubbed, with the keys and expiries from
  the NOTES table. No Redis URL means an in-memory map with the same expiries.
- Tests: output checks with good and bad roasts, template lines for every
  key, in-memory store expiry. The SDK is mocked, never called in tests.

Done when: `npm test` passes with no env vars set, a bad roast falls back
to a template, blocklist read works.

## Phase 4: Pages

Files: `lib/report.ts`, everything under `app/` and `components/`, `next.config.ts`.

Goal: the three-phase stream and the cards people screenshot.

Follow `design/README.md` and the boards in `design/boards/`. Resolve the
"beyond NOTES.md" list there with the user before starting.

- `report.ts` runs the pipeline in order: standings, manager fetches with a
  progress counter, facts ranked, then cards as each writer call finishes.
  Lock per league, rate limits per IP hash and global, never cache a failed
  build, "not found" cached one minute, 1 hour cache while the GW is live.
- `/`: one input for league ID, FPL URL or team ID. Demo link. How to find
  your ID.
- `/league/[id]`: cache hit renders in one go on the server. Cache miss
  renders the shell and the client streams from `/api/league/[id]`.
  Standings strip, awards strip, one card per manager, copy and share
  buttons, report link that opens a GitHub issue with the roast encoded.
- `/team/[id]`: pick list capped at 20.
- Image routes serve a card only if the league is cached and the entry is a
  member, otherwise a generic branded image. Never trigger a build. Long
  Cache-Control. Font with emoji, hard name truncation.
- Blocklisted entries render the neutral "opted out" card.
- Security headers in `next.config.ts`. Plain error messages. No
  `dangerouslySetInnerHTML`.

Done when: a cold league streams all three phases in the browser, a warm one
renders in one go, both share images render, the app runs with no env vars.
