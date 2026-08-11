import StatTile from "./StatTile";
import { formatCurrencyCompact, formatPercentFraction, formatDecimal, formatCount } from "../../utils/format";

export default function OperationsSummaryStrip({ summary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Avg Shipping Time"
        value={`${formatDecimal(summary.avgShippingTime.value, 2)} days`}
        sublabel={`B2B ${formatDecimal(summary.avgShippingTime.b2b, 2)} · B2C ${formatDecimal(summary.avgShippingTime.b2c, 2)}`}
        deltaPct={summary.avgShippingTime.wowDeltaPct}
        positiveIsGood={false}
      />
      <StatTile
        label="Quality $"
        value={formatCurrencyCompact(summary.qualityDollars.result)}
        sublabel={`vs ${formatCurrencyCompact(summary.qualityDollars.budget)} budget`}
        deltaPct={summary.qualityDollars.wowDeltaPct}
        positiveIsGood={false}
      />
      <StatTile
        label="Repair Rate %"
        value={formatPercentFraction(summary.repairRatePct.value)}
        deltaPct={summary.repairRatePct.wowDeltaPct}
      />
      <StatTile
        label="New Social + Klaviyo Adds"
        value={formatCount(summary.newSocialAdds.result)}
        sublabel={`Social ${formatCount(summary.newSocialAdds.social)} · Klaviyo ${formatCount(summary.newSocialAdds.klaviyo)}`}
        deltaPct={summary.newSocialAdds.wowDeltaPct}
      />
    </div>
  );
}
