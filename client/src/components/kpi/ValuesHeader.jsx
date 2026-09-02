import { formatValue } from "../../utils/format";
import { useResolveNamedColor } from "../../utils/theme";
import TrendArrow from "./TrendArrow";

// For cards with two (or more) named values instead of a single Result/Goal
// pair — e.g. In-Stock % (Order Fill vs SKU Avail), Shipping Time (B2B vs
// B2C). No attainment pill: there's no single target to score against, so
// each value just gets its own WoW arrow.
export default function ValuesHeader({ name, values, goalDirection = "higher", hideName = false }) {
  const resolveNamedColor = useResolveNamedColor();

  return (
    <div>
      {!hideName && <h3 className="text-center text-base font-bold uppercase tracking-wide text-ink">{name}</h3>}

      <div className={`${hideName ? "" : "mt-3"} flex w-full items-baseline justify-center gap-3 border border-black/40 p-3 dark:border-white/15`}>
        {values.map((entry) => (
          <div key={entry.label} className="min-w-0 flex-1 text-center">
            <div
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: resolveNamedColor(entry.color) }}
            >
              {entry.label}
            </div>
            <div
              className="truncate text-[32px] font-bold tabular-nums leading-tight"
              style={{ color: resolveNamedColor(entry.color) }}
            >
              {formatValue(entry.value, entry.format)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-3">
        {values.map((entry) => (
          <TrendArrow key={entry.label} deltaPct={entry.wowDeltaPct} positiveIsGood={goalDirection !== "lower"} />
        ))}
      </div>
    </div>
  );
}
