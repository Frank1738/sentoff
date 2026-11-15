# Design

Source: Claude Design export, saved 15 Nov 2026. `fpl-roast.html` is the
original file and opens in a browser as is. `boards/` is the same thing
unpacked: one folder per board, `index.html` is the markup and inline styles,
the other files are the fonts and scripts it references.

| Board | Size | Shows |
|---|---|---|
| 01-home | 390 x 844 | Input, submit, demo link, how to find your ID |
| 02a-loading | 390 x 844 | Progress bar, "Reading N of 20", cards arriving |
| 02-league-report | 390 x 4200 | Header, table, awards, player ratings |
| 02b-not-found-private-rate-limited-league-picker | 4 phones | Error states and the team ID pick list |
| 03-share-image-1080-1350 | 1080 x 1350 | Portrait share card for WhatsApp |
| 03b-og-image-1200-630 | 1200 x 630 | Link preview |
| 03c-both-images-at-chat-size | 390 x 844 | Both images as they land in a chat |
| 04-motion-gifs | | Card arrival, stamp, print and bar motion |

## Tokens

| Token | Value | Used for |
|---|---|---|
| bg | `#0F1612` | page background, dark buttons |
| canvas | `#0A0F0C` | behind boards only |
| raised | `#1D2922` | inputs, pick-list rows, "you" table row |
| text | `#EEEBE3` | body text, hero card background, light buttons |
| muted | `#A3ADA5` | secondary text on dark |
| muted on light | `#4E5850` | secondary text on the hero card |
| line | `#3A4A40` | dividers, progress track |
| border | `#7A8A80` | input and secondary button borders |
| border on light | `#6E766F` | secondary button on the hero card |
| red | `#FF4B3E` | primary button, red card, logo mark |
| yellow | `#F5C518` | yellow card, focus ring, error border, retry bar |

Fonts: Zilla Slab 700 for display (names, ratings, headings), 600 for the
hero roast line. Inter 400, 500, 600 for everything else. Numbers use
`font-variant-numeric: tabular-nums`.

The board sizes above are the full sizes, shown from 480px wide up. On phones the
headings, names, ratings and the hero roast line shrink in a straight line to 70%
at 320px (see the `--text-fluid-*` tokens in `app/globals.css`), so 46px on the
board is about 40px on a 390px phone and 37px on a 360px one.

Desktop, 1024px and up (boards 05 and 06): the home page is a 480px form column
(420px below 1280px) with two sample cards beside it; the report and loading
screens are a sticky 420px column (header, table, awards) next to the 430px
ratings column, so no card is ever wider than on a phone. A left column taller
than the window scrolls until its last row shows, then pins 24px above the bottom.

Radius 3px on cards, inputs and buttons. Card icons 2 to 4px, scaled with
size. Primary buttons 56px tall, secondary 44px. Focus ring 2px yellow,
offset 2px. Mobile first at 390px wide, 20 to 24px side padding.

Motion: pages enter block by block, 60ms apart (fade, 6px blur, 6px rise, 500ms); table and
awards rows draw their line from the left (600ms) then slide their text in (400ms), 50ms apart.
Card arrival 280ms slide up, card icon stamp 110ms after a 200ms
delay, share preview "print" 360ms, progress bar 240ms. All off under
`prefers-reduced-motion`.

## Card anatomy

Three card sizes in the report, chosen by rank and sting:

- **Hero**: light background, 40px name, 72px rating, label "Man of the
  match" or "Sent off", archetype, 27px serif roast line, numbers line,
  copy and share buttons.
- **Standard**: dark, 30px name, 46px rating, card icon with archetype,
  16px roast, numbers line, buttons.
- **Compact**: two-column grid, 26px rating, one-line fact. No buttons.

Every card shows: rank with ordinal and arrow, points, name, team, rating
out of 10, card icon (red, yellow or none), archetype, roast, the numbers
behind it.

Share image shows: rank and archetype line, name, giant rating, card icon,
roast line, league URL. Portrait 1080 x 1350 for the chat, 1200 x 630 for
link previews.

## Copy

- Home: "Every manager in your mini-league, rated." Button "Roast the
  league", busy "Fetching the league…". Error "Paste a league ID, league URL
  or team ID first." Help "Your ID: Leagues & Cups › your league › the
  number in the URL."
- Report: "Match report, after Gameweek N", "N managers rated · League ID",
  sections "Table", "Awards", "Player ratings". Footer "Ratings are the
  pundit's and are final. Built from public FPL data after the GWN deadline."
- Loading: "Reading N of 20", "N rated", "All 20 managers read", "That will
  do.", "Open report · N of 20 ready".
- Errors: "No such league.", "That league is private." (asks for a team ID
  instead), "FPL has asked us to slow down." with "Paused at 9 of 20" and
  "Retrying on its own in 30 seconds."
- Picker: "Team N is in four leagues." "Pick one to rate." Oversized leagues
  listed but disabled: "Too big to rate: 214,906 managers."

## Where the design goes beyond NOTES.md

Decide these before Phase 4. NOTES.md wins until it is changed.

1. **Cards stream in while reading.** The loading board shows cards arriving
   one by one with the rating counting up. NOTES.md says no card is final
   until all managers are fetched, because sting is ranked league-wide.
   Either show provisional cards that settle, or show standings and
   progress only, then all cards at once.
2. **Rating out of 10.** `rating = round((100 - sting) / 10)`. Not in the
   spec or types. Needs a field on Manager or a derived helper.
3. **Card icon and hero label.** Red, yellow, none, plus "Man of the match"
   for the leader. Needs a rule for who gets which, and a field on Manager.
4. **Three card sizes.** Hero, standard, compact. Needs a rule for which
   manager gets which size.
5. **Portrait share image 1080 x 1350.** NOTES.md only has 1200 x 630. The
   card route should produce the portrait, the opengraph route the landscape.
6. **"You" row in the table.** Only possible when the visitor arrived via a
   team ID. Otherwise there is no viewer.
7. **Table shows ranks 1 to 3 and 18 to 20 only.** Middle collapsed to a
   dots row.
8. **Pick list skips leagues over 50 managers.** NOTES.md caps at 20 from the
   first standings page. Pick one number.
9. **Rate-limit screen keeps partial progress and retries in 30 seconds.**
   Needs the stream to report a paused state, not just an error.
10. **Name and URL.** The design says "FPL Roast" and `fplroast.app/l/ID`.
    The repo is "Sent Off" with `/league/[id]`. Pick one before the share
    image bakes a URL in.
11. **Zilla Slab** must be loaded for pages and shipped as a TTF for the
    image routes. The export only embeds Inter.
