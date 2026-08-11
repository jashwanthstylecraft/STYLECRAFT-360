import StatTile from "./StatTile";
import { formatCurrencyCompact, formatPercent, formatPercentFraction } from "../../utils/format";

export default function FinanceSummaryStrip({ summary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="A/R Total"
        value={formatCurrencyCompact(summary.arTotal.result)}
        deltaPct={summary.arTotal.wowDeltaPct}
        positiveIsGood={false}
      />
      <StatTile
        label="Past Due $"
        value={formatCurrencyCompact(summary.pastDue.result)}
        sublabel={`${formatPercent(summary.pastDue.pctOfArTotal)} of total A/R`}
        deltaPct={summary.pastDue.wowDeltaPct}
        positiveIsGood={false}
      />
      <StatTile
        label="Gross Margin %"
        value={formatPercentFraction(summary.grossMargin.value)}
        deltaPct={summary.grossMargin.wowDeltaPct}
      />
      <StatTile
        label="Past Due vs Budget"
        value={formatCurrencyCompact(summary.pastDueVsBudget.variance)}
        sublabel={summary.pastDueVsBudget.variance > 0 ? "over budget" : "under budget"}
        deltaPct={summary.pastDueVsBudget.wowPointDelta}
        positiveIsGood={false}
        formatter={(v) => formatCurrencyCompact(v)}
      />
    </div>
  );
}
