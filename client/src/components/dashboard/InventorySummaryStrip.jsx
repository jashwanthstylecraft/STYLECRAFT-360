import StatTile from "./StatTile";
import { formatCurrencyCompact, formatPercent, formatPercentFraction } from "../../utils/format";

export default function InventorySummaryStrip({ summary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Inventory Level vs Goal"
        value={formatPercent(summary.inventoryLevelAttainmentPct.value)}
        deltaPct={summary.inventoryLevelAttainmentPct.wowPointDelta}
        formatter={(v) => `${v.toFixed(1)} pts`}
      />
      <StatTile
        label="Open PO $"
        value={formatCurrencyCompact(summary.openPoTotal.result)}
        sublabel={`${formatCurrencyCompact(summary.openPoTotal.paid)} paid · ${formatCurrencyCompact(summary.openPoTotal.unpaid)} unpaid`}
        deltaPct={summary.openPoTotal.wowDeltaPct}
        positiveIsGood={false}
      />
      <StatTile
        label="Order Fill %"
        value={formatPercentFraction(summary.orderFillPct.value)}
        deltaPct={summary.orderFillPct.wowDeltaPct}
      />
      <StatTile
        label="Discrepancy $"
        value={formatCurrencyCompact(summary.discrepancy.result)}
        deltaPct={summary.discrepancy.magnitudeWowDeltaPct}
        positiveIsGood={false}
      />
    </div>
  );
}
