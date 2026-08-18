import { motion } from "framer-motion";
import { formatValue, formatPercent } from "../../utils/format";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { EASE } from "../../lib/motion";

const BAR_DURATION = 0.8;
const SERIES_STAGGER = 0.15; // Goal's bar starts growing just after Result's, same feel as the app's other paired-series draws

// One horizontal track per block, Result and Goal as two stacked fills in
// the same two colors every Result/Goal header in the app already uses
// (`bg-actual-strong` / `bg-goal` — see ResultGoalHeader.jsx) so this reads
// as "the same comparison, zoomed out to the whole year" rather than a new
// visual language. Width is proportional to whichever of the two is larger,
// so Result and Goal are always comparable on the same scale. Hover (native
// `title`, matching this app's only non-chart tooltip convention — see
// DataTable.jsx/Sidebar.jsx) shows the exact number.
function BarRow({ label, value, max, colorClass, format, delay, reduceMotion }) {
  const pct = max > 0 ? Math.min(100, (Math.abs(value) / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3" title={`${label}: ${formatValue(value, format)}`}>
      <div className="w-14 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="h-6 flex-1 overflow-hidden rounded-md bg-surface-hover">
        <motion.div
          className={`h-full rounded-md ${colorClass}`}
          initial={{ width: reduceMotion ? `${pct}%` : 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, amount: 0.4 }}
          transition={reduceMotion ? { duration: 0 } : { duration: BAR_DURATION, ease: EASE, delay }}
        />
      </div>
      <div className="w-28 shrink-0 text-right text-sm font-bold tabular-nums text-ink">{formatValue(value, format)}</div>
    </div>
  );
}

function YtdBlock({ block, reduceMotion }) {
  const { label, format, ytdResult, ytdGoal } = block;
  const max = Math.max(Math.abs(ytdResult), Math.abs(ytdGoal));
  const attainmentPct = ytdGoal !== 0 ? (ytdResult / ytdGoal) * 100 : null;

  return (
    <div>
      {label && <div className="mb-2 text-sm font-semibold text-heading">{label}</div>}
      <div className="space-y-2">
        <BarRow label="Result" value={ytdResult} max={max} colorClass="bg-actual-strong" format={format} delay={0} reduceMotion={reduceMotion} />
        <BarRow
          label="Goal"
          value={ytdGoal}
          max={max}
          colorClass="bg-goal"
          format={format}
          delay={SERIES_STAGGER}
          reduceMotion={reduceMotion}
        />
      </div>
      {attainmentPct !== null && (
        <motion.div
          className="mt-2 text-xs font-medium text-ink-secondary"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.3, delay: reduceMotion ? 0 : BAR_DURATION * 0.6 }}
        >
          {formatPercent(attainmentPct)} of YTD goal
        </motion.div>
      )}
    </div>
  );
}

// Renders nothing when the metric doesn't support a meaningful YTD
// comparison (see buildYtdStats in server/services/detailStats.js) —
// snapshot/balance metrics and metrics with no real per-week goal.
export default function YtdComparisonBar({ blocks }) {
  const reduceMotion = usePrefersReducedMotion();
  if (!blocks || blocks.length === 0) return null;

  return (
    <motion.div
      className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm sm:p-5"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: EASE }}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-secondary">Year to Date — Result vs. Goal</h3>
      <div className="space-y-5">
        {blocks.map((block) => (
          <YtdBlock key={block.key ?? "single"} block={block} reduceMotion={reduceMotion} />
        ))}
      </div>
    </motion.div>
  );
}
