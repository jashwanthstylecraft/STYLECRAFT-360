import { motion } from "framer-motion";
import { usePeriod, VALID_PERIODS } from "../../hooks/usePeriod";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

const LABELS = { weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };

export default function PeriodSelector() {
  const { period, setPeriod } = usePeriod();
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="flex items-center rounded-lg border border-surface-border bg-surface-card p-0.5 text-sm shadow-sm">
      {VALID_PERIODS.map((value) => {
        const active = value === period;
        return (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`relative rounded-md px-2.5 py-1.5 font-medium transition-colors ${
              active ? "text-white" : "text-ink-secondary hover:text-ink"
            }`}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="period-selector-highlight"
                className="absolute inset-0 rounded-md bg-actual"
                transition={reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{LABELS[value]}</span>
          </button>
        );
      })}
    </div>
  );
}
