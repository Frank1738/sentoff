// The two share images, as flat flexbox for satori: portrait 1080x1350 for the chat and
// landscape 1200x630 for link previews. Pure markup, no data access, no fonts - the routes own those.
import type { Manager } from "@/lib/types";
import { cardFor, ratingFor, shareMeta, sharpLine } from "./card-rules";

const BG = "#0F1612";
const TEXT = "#EEEBE3";
const MUTED = "#A3ADA5";
const RED = "#FF4B3E";
const YELLOW = "#F5C518";

export const PORTRAIT = { width: 1080, height: 1350 } as const;
export const LANDSCAPE = { width: 1200, height: 630 } as const;

/** Names are hard-truncated here: an over-long or emoji-heavy name must not push the layout about. */
function short(name: string, max: number): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function colourOf(manager: Manager): string | null {
  const colour = cardFor(manager);
  return colour === "red" ? RED : colour === "yellow" ? YELLOW : null;
}

/** The alt text both images carry, so the card is not silent to a screen reader. */
export function shareAlt(manager: Manager, isLeader: boolean): string {
  return `${shareMeta(manager, isLeader)}. ${manager.name}, rated ${ratingFor(
    manager,
  )} out of 10. ${sharpLine(manager)}`;
}

/** 1080 x 1350, the one that gets pasted into the group chat. */
export function PortraitCard({
  manager,
  isLeader,
  host,
  leagueId,
}: {
  manager: Manager;
  isLeader: boolean;
  host: string;
  leagueId: number;
}) {
  const colour = colourOf(manager);
  return (
    <div
      style={{
        width: PORTRAIT.width,
        height: PORTRAIT.height,
        display: "flex",
        flexDirection: "column",
        padding: "96px 88px 80px",
        background: BG,
        color: TEXT,
        fontFamily: "Zilla Slab",
      }}
    >
      <div style={{ display: "flex", fontSize: 44, color: MUTED }}>
        {shareMeta(manager, isLeader)}
      </div>
      <div style={{ display: "flex", marginTop: 16, fontSize: 124, fontWeight: 700 }}>
        {short(manager.name, 18)}
      </div>
      <div style={{ display: "flex", marginTop: 36, alignItems: "flex-end" }}>
        <div style={{ display: "flex", fontSize: 420, fontWeight: 700, lineHeight: 0.85 }}>
          {ratingFor(manager)}
        </div>
        <div
          style={{
            display: "flex",
            marginLeft: 20,
            marginBottom: 24,
            fontSize: 120,
            fontWeight: 700,
            color: MUTED,
          }}
        >
          /10
        </div>
        {colour && (
          <div
            style={{
              display: "flex",
              marginLeft: 44,
              marginBottom: 28,
              width: 230,
              height: 310,
              borderRadius: 16,
              background: colour,
            }}
          />
        )}
      </div>
      <div style={{ display: "flex", marginTop: 56, fontSize: 58, lineHeight: 1.25, fontWeight: 600 }}>
        {sharpLine(manager)}
      </div>
      <div style={{ display: "flex", marginTop: "auto", fontSize: 34, color: MUTED }}>
        {host}/league/{leagueId}
      </div>
    </div>
  );
}

/** 1200 x 630, the link preview. */
export function LandscapeCard({
  manager,
  isLeader,
  host,
  leagueId,
}: {
  manager: Manager;
  isLeader: boolean;
  host: string;
  leagueId: number;
}) {
  const colour = colourOf(manager);
  return (
    <div
      style={{
        width: LANDSCAPE.width,
        height: LANDSCAPE.height,
        display: "flex",
        padding: "56px 64px 48px",
        background: BG,
        color: TEXT,
        fontFamily: "Zilla Slab",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", alignSelf: "center" }}>
        <div style={{ display: "flex", fontSize: 260, fontWeight: 700, lineHeight: 0.85 }}>
          {ratingFor(manager)}
        </div>
        <div
          style={{
            display: "flex",
            marginLeft: 12,
            marginBottom: 16,
            fontSize: 64,
            fontWeight: 700,
            color: MUTED,
          }}
        >
          /10
        </div>
        {colour && (
          <div
            style={{
              display: "flex",
              marginLeft: 24,
              marginBottom: 18,
              width: 110,
              height: 148,
              borderRadius: 9,
              background: colour,
            }}
          />
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginLeft: 48,
          flex: 1,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", marginTop: 10, fontSize: 26, color: MUTED }}>
          {shareMeta(manager, isLeader)}
        </div>
        <div style={{ display: "flex", marginTop: 10, fontSize: 70, fontWeight: 700 }}>
          {short(manager.name, 16)}
        </div>
        <div style={{ display: "flex", marginTop: 26, fontSize: 36, lineHeight: 1.3, fontWeight: 600 }}>
          {sharpLine(manager)}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            alignSelf: "flex-end",
            fontSize: 22,
            color: MUTED,
          }}
        >
          {host}/league/{leagueId}
        </div>
      </div>
    </div>
  );
}

/**
 * What a crawler gets when the league is not cached, the entry is not a member, or the manager
 * opted out. Branded, says nothing about anybody, and never costs a build.
 */
export function GenericCard({
  width,
  height,
  host,
}: {
  width: number;
  height: number;
  host: string;
}) {
  const unit = Math.round(width / 18);
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: unit * 1.5,
        background: BG,
        color: TEXT,
        fontFamily: "Zilla Slab",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            width: unit * 0.7,
            height: unit,
            borderRadius: 4,
            background: RED,
          }}
        />
        <div style={{ display: "flex", marginLeft: unit * 0.5, fontSize: unit, fontWeight: 700 }}>
          Sent Off
        </div>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: unit * 0.8,
          fontSize: unit * 1.5,
          fontWeight: 700,
          lineHeight: 1.05,
        }}
      >
        Every manager in your mini-league, rated.
      </div>
      <div style={{ display: "flex", marginTop: unit * 0.6, fontSize: unit * 0.5, color: MUTED }}>
        {host}
      </div>
    </div>
  );
}

