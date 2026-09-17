import { formatValue, formatPercent } from "../../utils/format";

// Result/Goal bars for a single YTD block, always visible at the bottom of
// a KpiCard (no hover/flip — see the card's own comment for why that was
// dropped). Same color language as YtdComparisonBar.jsx on the detail page
// (bg-actual-strong / bg-goal), just sized for a grid card instead of a
// full-width panel.
function YtdInlineBlock({ block }) {
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

// Sits at the bottom of a KpiCard, below the chart, always visible — no
// interaction needed to see it. Renders nothing when the metric has no
// meaningful YTD comparison (see buildYtdStats server-side); KpiCard only
// mounts this at all when there's real data.
export default function YtdInline({ blocks }) {
  if (!blocks?.length) return null;

  return (
    <div className="mt-3 border-t border-surface-border pt-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">Year to Date</h3>
      <div className="space-y-3">
        {blocks.map((block) => (
          <YtdInlineBlock key={block.key ?? "single"} block={block} />
        ))}
      </div>
    </div>
  );
}
