import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { formatPercent } from "../../utils/format";
import { usePeriod } from "../../hooks/usePeriod";

// `positiveIsGood` lets a metric like Open Backorders invert the color
// mapping — going up is bad there even though the arrow still points up.
// `formatter` lets callers express the delta in units other than percent
// change (e.g. attainment percentage points). `suffix` defaults to the
// current period's delta label (WoW/MoM/QoQ/YoY) — callers only need to pass
// it explicitly to override that (or "" to suppress it). `arrowMeansGood`
// flips the icon itself to track good/bad instead of literal direction (up =
// improving, down = worsening) — opt-in, off by default so every other card
// keeps showing the number's actual direction.
export default function TrendArrow({
  deltaPct,
  positiveIsGood = true,
  formatter = (v) => formatPercent(v),
  suffix,
  arrowMeansGood = false,
}) {
  const { deltaLabel } = usePeriod();
  const resolvedSuffix = suffix === undefined ? deltaLabel : suffix;

  if (deltaPct === null || deltaPct === undefined) {
    return <span className="text-xs font-medium text-ink-muted">—</span>;
  }

  // A real (not missing) prior value of exactly 0 can't express a % change
  // mathematically. The server can't send actual `Infinity` — it isn't
  // valid JSON and silently becomes `null` on the wire, indistinguishable
  // from true missing data — so it sends a large finite sentinel (see
  // WOW_NEW_SENTINEL in metricsHelpers.js/salesService.js) for "0 to
  // something" moves instead of blanking them. Show "New" instead of a
  // literal six-figure percentage.
  const isInfinite = Math.abs(deltaPct) >= 1e6;
  const isFlat = !isInfinite && Math.abs(deltaPct) < 0.05;
  const isUp = deltaPct > 0;
  const isGood = isFlat ? true : isUp === positiveIsGood;
  const colorClass = isFlat ? "text-ink-muted" : isGood ? "text-positive" : "text-negative";
  const pointsUp = arrowMeansGood ? isGood : isUp;
  const Icon = isFlat ? Minus : pointsUp ? ArrowUp : ArrowDown;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${colorClass}`}>
      <Icon size={13} strokeWidth={2.5} />
      {isInfinite ? "New" : formatter(Math.abs(deltaPct))}
      {resolvedSuffix && !isInfinite && <span className="text-ink-muted">{resolvedSuffix}</span>}
    </span>
  );
}
