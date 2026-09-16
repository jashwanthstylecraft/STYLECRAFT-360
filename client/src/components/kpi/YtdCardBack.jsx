import { formatValue, formatPercent } from "../../utils/format";
import TrendArrow from "./TrendArrow";

// A compact version of YtdComparisonBar.jsx's Result/Goal bars, sized for
// the back face of a flipped KpiCard rather than the full detail-page card
// — same color language (bg-actual-strong / bg-goal), no scroll-triggered
// animation since the flip itself is the reveal.
function YtdBackBlock({ block }) {
  const { label, format, ytdResult, ytdGoal } = block;
  const max = Math.max(Math.abs(ytdResult), Math.abs(ytdGoal));
  const pct = max > 0 ? Math.min(100, (Math.abs(ytdResult) / max) * 100) : 0;
  const goalPct = max > 0 ? Math.min(100, (Math.abs(ytdGoal) / max) * 100) : 0;
  const attainmentPct = ytdGoal !== 0 ? (ytdResult / ytdGoal) * 100 : null;

  return (
    <div>
      {label && <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</div>}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-10 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Result</div>
          <div className="h-4 flex-1 overflow-hidden rounded-md bg-surface-hover">
            <div className="h-full rounded-md bg-actual-strong" style={{ width: `${pct}%` }} />
          </div>
          <div className="w-20 shrink-0 text-right text-xs font-bold tabular-nums text-ink">{formatValue(ytdResult, format)}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Goal</div>
          <div className="h-4 flex-1 overflow-hidden rounded-md bg-surface-hover">
            <div className="h-full rounded-md bg-goal" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="w-20 shrink-0 text-right text-xs font-bold tabular-nums text-ink">{formatValue(ytdGoal, format)}</div>
        </div>
      </div>
      {attainmentPct !== null && (
        <div className="mt-1.5 text-xs font-medium text-ink-secondary">{formatPercent(attainmentPct)} of YTD goal</div>
      )}
    </div>
  );
}

// Compact per-block row of the same 13/26/39-week TrendArrow pills as
// RateOfChangePanel.jsx, sized for the card back instead of the full
// detail-page panel.
function RocBackBlock({ block, positiveIsGood }) {
  return (
    <div>
      {block.label && <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">{block.label}</div>}
      <div className="flex flex-wrap gap-1.5">
        {block.periods.map((period) => (
          <TrendArrow key={period.key} deltaPct={period.value} positiveIsGood={positiveIsGood} suffix={`${period.weeks}-Wk`} />
        ))}
      </div>
    </div>
  );
}

// The flip card's back face — Year to Date (if the metric has one) then
// Rate of Change below it (if it has one); either half is skipped
// entirely when that metric has no meaningful data for it (see
// buildYtdStats/buildRocStats server-side) rather than showing an empty
// heading. KpiCard.jsx only renders this at all when at least one exists.
export default function YtdCardBack({ ytdBlocks, rocBlocks, goalDirection }) {
  const hasYtd = Boolean(ytdBlocks?.length);
  const hasRoc = Boolean(rocBlocks?.length);
  const positiveIsGood = goalDirection !== "lower";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {hasYtd && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-secondary">Year to Date</h3>
          <div className="space-y-4">
            {ytdBlocks.map((block) => (
              <YtdBackBlock key={block.key ?? "single"} block={block} />
            ))}
          </div>
        </div>
      )}
      {hasRoc && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-secondary">Rate of Change</h3>
          <div className="space-y-3">
            {rocBlocks.map((block) => (
              <RocBackBlock key={block.key ?? "single"} block={block} positiveIsGood={positiveIsGood} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
