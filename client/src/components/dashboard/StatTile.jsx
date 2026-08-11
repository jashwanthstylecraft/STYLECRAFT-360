import TrendArrow from "../kpi/TrendArrow";

export default function StatTile({ label, value, sublabel, deltaPct, positiveIsGood = true, formatter, suffix }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">{label}</div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums text-heading">{value}</div>
      {sublabel && <div className="mt-0.5 text-xs text-ink-muted">{sublabel}</div>}
      <div className="mt-1.5">
        <TrendArrow
          deltaPct={deltaPct}
          positiveIsGood={positiveIsGood}
          formatter={formatter}
          suffix={suffix}
        />
      </div>
    </div>
  );
}
