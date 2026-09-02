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
      <h3 className="text-center text-base font-bold uppercase tracking-wide text-ink">{name}</h3>

      <div className="mt-3 flex w-full items-baseline justify-center gap-3 border border-black/40 p-3 dark:border-white/15">
        <div className="min-w-0 flex-1 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-actual-strong">Result</div>
          <div
            className={`truncate text-[32px] font-bold tabular-nums leading-tight ${
              resultIsNegative ? "text-negative" : "text-actual-strong"
            }`}
          >
            {formatValue(result, format, { roundThousands: true })}
          </div>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-goal">{goalLabel}</div>
          <div className="truncate text-[32px] font-bold tabular-nums leading-tight text-goal">
            {formatValue(goal, format, { roundThousands: true })}
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-2.5">
        <AttainmentPill attainmentPct={attainmentPct} result={result} goal={goal} goalDirection={goalDirection} goalLabel={goalLabel} />
        <TrendArrow deltaPct={wowDeltaPct} positiveIsGood={goalDirection !== "lower"} />
      </div>
    </div>
  );
}
