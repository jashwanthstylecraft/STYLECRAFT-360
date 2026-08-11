import { formatPercent } from "../../utils/format";

// `goalDirection` flips what "good" means: for a "higher" goal (most Sales
// metrics), attainment >=100% is on track. For a "lower" goal (a budget or
// ceiling), the same >=100% means blown past it — so we score against a
// reflection around 100 instead of the raw percentage.
function attainmentTier(pct, goalDirection) {
  if (pct === null || pct === undefined) return null;
  const score = goalDirection === "lower" ? 200 - pct : pct;

  if (goalDirection === "lower") {
    if (score >= 100) return { label: "Under budget", classes: GREEN };
    if (score >= 85) return { label: "Near budget", classes: AMBER };
    return { label: "Over budget", classes: RED };
  }

  if (score >= 100) return { label: "On track", classes: GREEN };
  if (score >= 85) return { label: "At risk", classes: AMBER };
  return { label: "Behind", classes: RED };
}

const GREEN = "bg-green-50 text-positive ring-green-200 dark:bg-green-500/10 dark:ring-green-500/30";
const AMBER = "bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30";
const RED = "bg-red-50 text-negative ring-red-200 dark:bg-red-500/10 dark:ring-red-500/30";

export default function AttainmentPill({ attainmentPct, result, goal, goalDirection = "higher", goalLabel = "Goal" }) {
  // A goal of exactly zero (e.g. "no discrepancy") makes "% of goal" undefined
  // math — fall back to a binary on/off-target read instead of a fake ratio.
  if (goal === 0) {
    const onTarget = result === 0;
    const classes = onTarget ? GREEN : AMBER;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${classes}`}>
        {onTarget ? "On target" : "Off target"}
      </span>
    );
  }

  const tier = attainmentTier(attainmentPct, goalDirection);

  if (!tier) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-ink-muted ring-1 ring-inset ring-slate-200 dark:bg-white/5 dark:ring-white/10">
        No goal set
      </span>
    );
  }

  // Phase 1's exact copy ("92.5% to goal") is preserved for the default
  // higher-is-better case; "of budget" reads better once a metric is framed
  // as a ceiling ("143% of budget" vs. the nonsensical "143% to budget").
  const preposition = goalDirection === "lower" ? "of" : "to";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tier.classes}`}
    >
      {formatPercent(attainmentPct)} {preposition} {goalLabel.toLowerCase()}
    </span>
  );
}
