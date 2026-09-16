import { formatValue, formatPercent } from "../../utils/format";

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

export default function YtdCardBack({ blocks }) {
  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-secondary">Year to Date</h3>
      <div className="flex-1 space-y-4 overflow-y-auto">
        {blocks.map((block) => (
          <YtdBackBlock key={block.key ?? "single"} block={block} />
        ))}
      </div>
    </div>
  );
}
