// The app icon drawing: a red card, tilted like one just shown, on the site's dark green.
// Rendered by next/og in app/icon.tsx and app/apple-icon.tsx, so only plain inline styles work here.

/** Scale 1 is the 32px tab icon; apple-icon uses 5.6 for 180px. */
export default function RedCardIcon({ scale }: { scale: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1612",
        borderRadius: 6 * scale,
      }}
    >
      <div
        style={{
          width: 14 * scale,
          height: 20 * scale,
          background: "#ff4b3e",
          borderRadius: 2 * scale,
          transform: "rotate(-12deg)",
        }}
      />
    </div>
  );
}
