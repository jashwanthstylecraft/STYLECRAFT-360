import StatTile from "../dashboard/StatTile";
import { formatValue } from "../../utils/format";
import { formatWeekEndingLabel } from "../../utils/weekCalendar";

const AGGREGATE_LABEL = { sum: "Range Total", average: "Range Average", last: "Range-End Level" };

function BestWorstTile({ label, point, format, positiveIsGood }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold tabular-nums ${positiveIsGood ? "text-positive" : "text-negative"}`}>
        {point ? formatValue(point.value, format) : "—"}
      </div>
      <div className="mt-0.5 text-xs text-ink-muted">{point ? formatWeekEndingLabel(point.weekEnding) : "No data in range"}</div>
    </div>
  );
}

// One block per named series (length 1 for plain/stacked metrics, 2+ for
// groupKeys metrics like Shipping Time B2B/B2C) — each block is the full set
// of stats for that series, so a dual-series metric shows two side-by-side
// panels rather than trying to force one combined number that doesn't exist.
function SeriesStatsBlock({ block, goalDirection }) {
  const format = block.format;
  const lowerIsBetter = goalDirection === "lower";
  const latestMA = block.movingAverage?.[block.movingAverage.length - 1] ?? null;

  return (
    <div>
      {block.label && <div className="mb-3 text-sm font-semibold text-heading">{block.label}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Latest"
          value={formatValue(block.latest.value, format)}
          sublabel={block.latest.goal !== null ? `Goal ${formatValue(block.latest.goal, format)}` : "No goal set"}
          deltaPct={block.periodDelta}
          positiveIsGood={!lowerIsBetter}
        />
        <StatTile
          label={AGGREGATE_LABEL[block.rangeAggregate.method] ?? "Range Value"}
          value={formatValue(block.rangeAggregate.value, format)}
        />
        <BestWorstTile label="Best Week" point={block.bestWeek} format={format} positiveIsGood />
        <BestWorstTile label="Worst Week" point={block.worstWeek} format={format} positiveIsGood={false} />
        <StatTile
          label={`${block.movingAverageWindow}-Week Moving Avg`}
          value={formatValue(latestMA, format)}
          sublabel="(entered weeks)"
        />
        <StatTile
          label="Weeks At Goal"
          value={block.weeksAtGoal === null ? "—" : `${block.weeksAtGoal} of ${block.coverage.total}`}
        />
        <StatTile
          label="Current Streak"
          value={block.streak ? `${block.streak.count}-week ${block.streak.type}` : "—"}
        />
        <StatTile
          label="Data Coverage"
          value={`${block.coverage.entered} of ${block.coverage.total} weeks`}
          sublabel={block.coverage.entered < block.coverage.total ? "entered in this range" : "fully entered"}
        />
      </div>
    </div>
  );
}

export default function StatsStrip({ stats, goalDirection }) {
  return (
    <div className="space-y-6">
      {stats.map((block) => (
        <SeriesStatsBlock key={block.key ?? "single"} block={block} goalDirection={goalDirection} />
      ))}
    </div>
  );
}
