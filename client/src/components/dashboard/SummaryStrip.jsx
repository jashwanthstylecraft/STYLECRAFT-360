import StatTile from "./StatTile";
import { formatCurrencyCompact, formatPercent } from "../../utils/format";

export default function SummaryStrip({ summary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Total Invoiced Sales"
        value={formatCurrencyCompact(summary.totalInvoiced.result)}
        deltaPct={summary.totalInvoiced.wowDeltaPct}
      />
      <StatTile
        label="Total D2C"
        value={formatCurrencyCompact(summary.totalD2C.result)}
        deltaPct={summary.totalD2C.wowDeltaPct}
      />
      <StatTile
        label="Overall Goal Attainment"
        value={formatPercent(summary.overallAttainmentPct.value)}
        deltaPct={summary.overallAttainmentPct.wowPointDelta}
        formatter={(v) => `${v.toFixed(1)} pts`}
      />
      <StatTile
        label="Open Backorders"
        value={formatCurrencyCompact(summary.openBackorders.result)}
        deltaPct={summary.openBackorders.wowDeltaPct}
        positiveIsGood={false}
      />
    </div>
  );
}
