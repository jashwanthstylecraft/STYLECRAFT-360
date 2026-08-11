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
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">{name}</h3>
      <div className="mt-2 flex items-baseline gap-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Pre-order</div>
          <div className="text-[28px] font-bold tabular-nums leading-tight text-actual-strong">
            {formatCurrencyCompact(preorderTotal)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Backorder</div>
          <div className="text-lg font-bold tabular-nums leading-tight text-goal">
            {formatCurrencyCompact(backorderTotal)}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <TrendArrow deltaPct={preorderWowDeltaPct} />
        <TrendArrow deltaPct={backorderWowDeltaPct} positiveIsGood={false} />
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
    <motion.div {...cardMotionProps(motionVariant, index, reduceMotion)}>
      <Link
        to={`${basePath}/${metric.slug}`}
        className="block rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm transition-shadow hover:shadow-md"
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
