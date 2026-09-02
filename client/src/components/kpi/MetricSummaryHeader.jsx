import ResultGoalHeader from "./ResultGoalHeader";
import ValuesHeader from "./ValuesHeader";
import TrendArrow from "./TrendArrow";
import { formatCurrencyCompact } from "../../utils/format";

// Phase 1's Pre-orders/Backorders card — kept exactly as it shipped. Every
// other headerValues-driven card (Phase 2+) goes through the generic
// ValuesHeader instead.
function GroupedHeader({ name, preorderTotal, backorderTotal, preorderWowDeltaPct, backorderWowDeltaPct, hideName }) {
  return (
    <div>
      {!hideName && <h3 className="text-center text-base font-bold uppercase tracking-wide text-ink">{name}</h3>}
      <div className={`${hideName ? "" : "mt-3"} flex w-full items-baseline justify-center gap-3 border border-black/40 p-3 dark:border-white/15`}>
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

// The Result/Goal (or Values, or Pre-order/Backorder) box + attainment/WoW
// pills every KpiCard shows — factored out so the metric detail page can
// show the exact same summary (title hidden via `hideName`, since the
// detail page already has its own big page title) instead of making a
// reader scroll back to the dashboard to see the numbers behind the chart.
export default function MetricSummaryHeader({ metric, hideName = false }) {
  const hasValuesHeader = Array.isArray(metric.headerValues);
  const isLegacyGrouped = metric.chartType === "grouped";
  const format = metric.format || "currency";
  const goalLabel = metric.goalLabel || "Goal";

  if (hasValuesHeader) {
    return <ValuesHeader name={metric.name} values={metric.headerValues} goalDirection={metric.goalDirection} hideName={hideName} />;
  }

  if (isLegacyGrouped) {
    return (
      <GroupedHeader
        name={metric.name}
        preorderTotal={metric.preorderTotal}
        backorderTotal={metric.backorderTotal}
        preorderWowDeltaPct={metric.preorderWowDeltaPct}
        backorderWowDeltaPct={metric.backorderWowDeltaPct}
        hideName={hideName}
      />
    );
  }

  return (
    <ResultGoalHeader
      name={metric.name}
      result={metric.result}
      goal={metric.goal}
      goalLabel={goalLabel}
      goalDirection={metric.goalDirection}
      format={format}
      attainmentPct={metric.attainmentPct}
      wowDeltaPct={metric.wowDeltaPct}
      hideName={hideName}
    />
  );
}
