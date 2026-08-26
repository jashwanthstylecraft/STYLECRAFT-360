import StatTile from "./StatTile";
import { formatCurrencyCompact, formatPercentFraction } from "../../utils/format";

export default function CustomerServiceSummaryStrip({ summary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatTile
        label="Total Returns"
        value={formatCurrencyCompact(summary.totalReturns.result)}
        deltaPct={summary.totalReturns.wowDeltaPct}
        positiveIsGood={false}
      />
      <StatTile
        label="Defective Returns"
        value={formatCurrencyCompact(summary.defectiveReturns.result)}
        deltaPct={summary.defectiveReturns.wowDeltaPct}
        positiveIsGood={false}
      />
      <StatTile
        label="Repair Rate %"
        value={formatPercentFraction(summary.repairRate.value)}
        deltaPct={summary.repairRate.wowDeltaPct}
      />
    </div>
  );
}
