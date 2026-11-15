/**
 * Remounts the page below the root layout on every navigation, so its CSS enter animations
 * (`enter-N`, `enter-flat-N` and `stack-reveal`) replay. See globals.css → "Page motion".
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return children;
}
