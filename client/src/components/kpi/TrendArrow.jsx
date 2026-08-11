import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { formatPercent } from "../../utils/format";
import { usePeriod } from "../../hooks/usePeriod";

// `positiveIsGood` lets a metric like Open Backorders invert the color
// mapping — going up is bad there even though the arrow still points up.
// `formatter` lets callers express the delta in units other than percent
// change (e.g. attainment percentage points). `suffix` defaults to the
// current period's delta label (WoW/MoM/QoQ/YoY) — callers only need to pass
// it explicitly to override that (or "" to suppress it).
export default function TrendArrow({
  deltaPct,
  positiveIsGood = true,
  formatter = (v) => formatPercent(v),
  suffix,
}) {
  const { deltaLabel } = usePeriod();
  const resolvedSuffix = suffix === undefined ? deltaLabel : suffix;

  if (deltaPct === null || deltaPct === undefined) {
    return <span className="text-xs font-medium text-ink-muted">—</span>;
  }

  const isFlat = Math.abs(deltaPct) < 0.05;
  const isUp = deltaPct > 0;
  const isGood = isFlat ? true : isUp === positiveIsGood;
  const colorClass = isFlat ? "text-ink-muted" : isGood ? "text-positive" : "text-negative";
  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${colorClass}`}>
      <Icon size={13} strokeWidth={2.5} />
      {formatter(Math.abs(deltaPct))}
      {resolvedSuffix && <span className="text-ink-muted">{resolvedSuffix}</span>}
    </span>
  );
}
