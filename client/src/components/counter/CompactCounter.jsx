import { useCounter } from "../../hooks/useCounter";
import OdometerCounter from "./OdometerCounter";

// The same live total as the home hero, everywhere else — small, static
// text (no odometer roll), so it doesn't compete for attention on pages
// that have their own headline numbers.
export default function CompactCounter() {
  const { total, isPlaceholder } = useCounter();

  if (total === null) return null;

  return (
    <div
      className="hidden items-baseline gap-1.5 border-l border-surface-border pl-4 text-xs text-ink-secondary md:flex"
      title={isPlaceholder ? "Unverified placeholder — real total not yet set via PUT /api/counter" : undefined}
    >
      <span className="whitespace-nowrap">Lifetime units</span>
      <OdometerCounter value={total} compact className="text-sm font-semibold text-heading" />
      {isPlaceholder && <span className="text-amber-500" aria-label="unverified placeholder">*</span>}
    </div>
  );
}
