import { formatValue } from "../../utils/format";
import AttainmentPill from "./AttainmentPill";
import TrendArrow from "./TrendArrow";

export default function ResultGoalHeader({
  name,
  result,
  goal,
  goalLabel = "Goal",
  goalDirection = "higher",
  format = "currency",
  attainmentPct,
  wowDeltaPct,
}) {
  // Negative currency (e.g. an inventory discrepancy) reads as risk even
  // before you parse the number — flag it in red rather than the usual blue.
  const resultIsNegative = format === "currency" && typeof result === "number" && result < 0;

  return (
    <div>
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">{name}</h3>

      <div className="mt-2 flex items-baseline gap-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Result</div>
          <div
            className={`text-[28px] font-bold tabular-nums leading-tight ${
              resultIsNegative ? "text-negative" : "text-actual-strong"
            }`}
          >
            {formatValue(result, format)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{goalLabel}</div>
          <div className="text-lg font-bold tabular-nums leading-tight text-goal">{formatValue(goal, format)}</div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <AttainmentPill attainmentPct={attainmentPct} result={result} goal={goal} goalDirection={goalDirection} goalLabel={goalLabel} />
        <TrendArrow deltaPct={wowDeltaPct} positiveIsGood={goalDirection !== "lower"} />
      </div>
    </div>
  );
}
