"use client";

// The left column of the desktop report and loading screens: header, table and awards.
import { useEffect, useRef, useState } from "react";

/** Space kept between the pinned column and the bottom of the window. */
const BOTTOM_GAP = 24;

/**
 * Sticks at `top` while the page scrolls. A column taller than the window would hide its last
 * rows, so it instead scrolls with the page until the last row is in view and pins there,
 * `BOTTOM_GAP` above the bottom. Measured on load and whenever the column or window changes size.
 * Below the desktop breakpoint the column is not sticky and the offset does nothing.
 */
export default function StickyColumn({
  top = 24,
  children,
}: {
  top?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(top);

  useEffect(() => {
    const column = ref.current;
    if (!column) return;
    const measure = () =>
      setOffset(Math.min(top, window.innerHeight - column.offsetHeight - BOTTOM_GAP));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(column);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [top]);

  return (
    <aside ref={ref} style={{ top: offset }} className="lg:sticky lg:w-[420px] lg:flex-none lg:pb-6">
      {children}
    </aside>
  );
}
