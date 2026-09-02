import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import ResultGoalHeader from "./ResultGoalHeader";
import ValuesHeader from "./ValuesHeader";
import TrendArrow from "./TrendArrow";
import MetricChart from "./MetricChart";
import { formatCurrencyCompact } from "../../utils/format";
import { cardMotionProps, chartMotionProps } from "../../lib/motion";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

// Phase 1's Pre-orders/Backorders card — kept exactly as it shipped. Every
// other headerValues-driven card (Phase 2+) goes through the generic
// ValuesHeader instead.
function GroupedHeader({ name, preorderTotal, backorderTotal, preorderWowDeltaPct, backorderWowDeltaPct }) {
  return (
    <div>
      <h3 className="text-center text-base font-bold uppercase tracking-wide text-ink">{name}</h3>
      <div className="mt-3 flex w-full items-baseline justify-center gap-3 border border-black/40 p-3 dark:border-white/15">
        <div className="min-w-0 flex-1 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-actual-strong">Pre-order</div>
          <div className="truncate text-[32px] font-bold tabular-nums leading-tight text-actual-strong">
            {formatCurrencyCompact(preorderTotal)}
          </div>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-goal">Backorder</div>
          <div className="truncate text-[32px] font-bold tabular-nums leading-tight text-goal">
            {formatCurrencyCompact(backorderTotal)}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-center gap-3">
        <TrendArrow deltaPct={preorderWowDeltaPct} arrowMeansGood />
        <TrendArrow deltaPct={backorderWowDeltaPct} positiveIsGood={false} arrowMeansGood />
      </div>
    </div>
  );
}

export default function KpiCard({ metric, weeks, basePath = "/sales", departmentKey = "sales", motionVariant = "slideUp", index = 0 }) {
  const reduceMotion = usePrefersReducedMotion();
  const hasValuesHeader = Array.isArray(metric.headerValues);
  const isLegacyGrouped = metric.chartType === "grouped";
  const format = metric.format || "currency";
  const goalLabel = metric.goalLabel || "Goal";

  const chartAnim = chartMotionProps(departmentKey, reduceMotion);
  // Finance's "bars rise with a slight overshoot spring" — Recharts' own
  // easing set has no true spring, so the overshoot lives on a wrapper
  // motion.div (a real spring) around an otherwise normally-animated chart.
  const useOvershootWrapper = departmentKey === "finance" && !reduceMotion;

  const chart = <MetricChart metric={metric} weeks={weeks} chartAnim={chartAnim} />;

  return (
    <motion.div className="h-full" {...cardMotionProps(motionVariant, index, reduceMotion)}>
      <Link
        to={`${basePath}/${metric.slug}`}
        className="block h-full rounded-none border-2 border-black bg-surface-card p-5 shadow-sm transition-shadow hover:shadow-md dark:rounded-2xl dark:border dark:border-surface-border"
      >
        {hasValuesHeader ? (
          <ValuesHeader name={metric.name} values={metric.headerValues} goalDirection={metric.goalDirection} />
        ) : isLegacyGrouped ? (
          <GroupedHeader
            name={metric.name}
            preorderTotal={metric.preorderTotal}
            backorderTotal={metric.backorderTotal}
            preorderWowDeltaPct={metric.preorderWowDeltaPct}
            backorderWowDeltaPct={metric.backorderWowDeltaPct}
          />
        ) : (
          <ResultGoalHeader
            name={metric.name}
            result={metric.result}
            goal={metric.goal}
            goalLabel={goalLabel}
            goalDirection={metric.goalDirection}
            format={format}
            attainmentPct={metric.attainmentPct}
            wowDeltaPct={metric.wowDeltaPct}
          />
        )}

        {useOvershootWrapper ? (
          <motion.div
            className="mt-3"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ type: "spring", bounce: 0.35, duration: 0.8, delay: 0.1 }}
          >
            {chart}
          </motion.div>
        ) : (
          <div className="mt-3">{chart}</div>
        )}
      </Link>
    </motion.div>
  );
}
