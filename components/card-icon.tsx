// The red or yellow card next to a name. Nothing renders when a manager has no card.
import { type CardColour, cardLabel } from "./card-rules";

const SIZES = {
  hero: "w-10 h-[54px] rounded-[4px]",
  standard: "w-[23px] h-[31px] rounded-[3px]",
  compact: "w-[11px] h-[15px] rounded-[2px]",
  award: "w-[14px] h-[19px] rounded-[2px]",
} as const;

export default function CardIcon({
  colour,
  size,
  stamp = false,
  className = "",
}: {
  colour: CardColour;
  size: keyof typeof SIZES;
  /** True while a card is arriving, for the 110ms stamp.  */
  stamp?: boolean;
  className?: string;
}) {
  if (colour === null) return null;
  return (
    <span
      role="img"
      aria-label={cardLabel(colour)}
      className={`block flex-none border border-bg/45 ${SIZES[size]} ${
        colour === "red" ? "bg-red" : "bg-yellow"
      } ${stamp ? "stamp" : ""} ${className}`}
    />
  );
}
