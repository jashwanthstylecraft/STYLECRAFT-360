import StatTile from "./StatTile";
import { formatCount } from "../../utils/format";

export default function MarketingSummaryStrip({ summary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <StatTile
        label="New Social + Klaviyo Adds"
        value={formatCount(summary.socialFollowSubs.result)}
        deltaPct={summary.socialFollowSubs.wowDeltaPct}
      />
      <StatTile
        label="Product Reviews"
        value={formatCount(summary.productReviews.result)}
        deltaPct={summary.productReviews.wowDeltaPct}
      />
    </div>
  );
}
