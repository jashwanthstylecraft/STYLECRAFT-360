import StatTile from "./StatTile";
import { formatCurrencyCompact, formatDecimal, formatCount } from "../../utils/format";

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
        label="Invoice Errors & Shortages"
        value={formatCurrencyCompact(summary.invoiceErrors.result)}
        sublabel={`vs ${formatCurrencyCompact(summary.invoiceErrors.budget)} budget`}
        deltaPct={summary.invoiceErrors.wowDeltaPct}
        positiveIsGood={false}
      />
      <StatTile
        label="Artwork Out the Door"
        value={formatCount(summary.artworkOutTheDoor.result)}
        deltaPct={summary.artworkOutTheDoor.wowDeltaPct}
      />
      <StatTile
        label="Education Events"
        value={`${formatCount(summary.educationEvents.completed)} completed`}
        sublabel={`${formatCount(summary.educationEvents.requested)} requested`}
        deltaPct={summary.educationEvents.wowDeltaPct}
      />
    </div>
  );
}
