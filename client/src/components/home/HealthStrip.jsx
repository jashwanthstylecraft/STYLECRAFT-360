import { formatPercent } from "../../utils/format";

// Mirrors AttainmentPill's higher-is-better tiering — every health score
// here is already normalized so >=100 is good, regardless of the
// department's underlying goal direction (see homeService.js).
function tierDotClass(pct) {
  if (pct === null || pct === undefined) return "bg-slate-300 dark:bg-white/20";
  if (pct >= 100) return "bg-positive";
  if (pct >= 85) return "bg-amber-500";
  return "bg-negative";
}

export default function HealthStrip({ departments }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-surface-border bg-surface-card px-5 py-4 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        All departments at a glance
      </span>
      {departments.map((dept) => (
        <div key={dept.key} className="flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${dept.built ? tierDotClass(dept.healthAttainmentPct) : "bg-slate-200 dark:bg-white/10"}`}
            aria-hidden="true"
          />
          <span className={dept.built ? "font-medium text-ink" : "text-ink-muted"}>{dept.label}</span>
          {dept.built && dept.healthAttainmentPct !== null && dept.healthAttainmentPct !== undefined && (
            <span className="tabular-nums text-ink-muted">{formatPercent(dept.healthAttainmentPct)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
