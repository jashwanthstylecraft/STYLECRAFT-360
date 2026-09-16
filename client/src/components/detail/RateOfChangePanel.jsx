import { motion } from "framer-motion";
import TrendArrow from "../kpi/TrendArrow";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { EASE } from "../../lib/motion";

// One row per resolved series block (mirrors YtdComparisonBar/StatsStrip's
// per-block pattern for groupKeys metrics, e.g. Shipping Time's B2B/B2C) —
// three TrendArrow pills, one per lookback. A period with no value yet
// (not enough history) renders TrendArrow's own "—", not a missing pill.
function RocBlockRow({ block, positiveIsGood }) {
  return (
    <div>
      {block.label && <div className="mb-2 text-sm font-semibold text-heading">{block.label}</div>}
      <div className="flex flex-wrap gap-2">
        {block.periods.map((period) => (
          <TrendArrow key={period.key} deltaPct={period.value} positiveIsGood={positiveIsGood} suffix={`${period.weeks}-Wk`} />
        ))}
      </div>
    </div>
  );
}

// Renders nothing when the metric has no real 13/26/39-week-back value yet
// (see buildRocStats in server/services/detailStats.js) — a metric with
// under 13 weeks of history has nothing to compare against.
export default function RateOfChangePanel({ blocks, goalDirection }) {
  const reduceMotion = usePrefersReducedMotion();
  if (!blocks || blocks.length === 0) return null;
  const positiveIsGood = goalDirection !== "lower";

  return (
    <motion.div
      className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm sm:p-5"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: EASE }}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-secondary">Rate of Change</h3>
      <div className="space-y-4">
        {blocks.map((block) => (
          <RocBlockRow key={block.key ?? "single"} block={block} positiveIsGood={positiveIsGood} />
        ))}
      </div>
    </motion.div>
  );
}
