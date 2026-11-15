/** Literal class names, so Tailwind generates each `enter-*` step. */
const enterClasses = [
  "enter-0",
  "enter-1",
  "enter-2",
  "enter-3",
  "enter-4",
  "enter-5",
  "enter-6",
  "enter-7",
  "enter-8",
] as const;

/**
 * Page-enter class for the block at `index` in page order: each block starts 60ms after the
 * previous one, capped at 8 blocks (globals.css → "Page motion"). Use it for list items; fixed
 * blocks can write `enter-N` directly.
 */
export function enterClass(index: number) {
  return enterClasses[Math.min(Math.max(index, 0), enterClasses.length - 1)];
}

/** How far apart stack-reveal rows start, and how long a row's line takes. Match globals.css. */
const STACK_ROW_MS = 50;
const STACK_LINE_MS = 600;

/** When the last of `rows` in a stack-reveal list has finished drawing, in ms from page enter. */
export function stackEnd(start: number, rows: number) {
  return start + Math.max(rows - 1, 0) * STACK_ROW_MS + STACK_LINE_MS;
}
