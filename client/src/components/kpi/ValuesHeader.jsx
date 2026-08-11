import { formatValue } from "../../utils/format";
import { useResolveNamedColor } from "../../utils/theme";
import TrendArrow from "./TrendArrow";

// For cards with two (or more) named values instead of a single Result/Goal
// pair — e.g. In-Stock % (Order Fill vs SKU Avail), Shipping Time (B2B vs
// B2C). No attainment pill: there's no single target to score against, so
// each value just gets its own WoW arrow.
export default function ValuesHeader({ name, values, goalDirection = "higher" }) {
  const resolveNamedColor = useResolveNamedColor();

  return (
    <div>
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">{name}</h3>

      <div className="mt-2 flex items-baseline gap-5">
        {values.map((entry, i) => (
          <div key={entry.label}>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{entry.label}</div>
            <div
              className={`font-bold tabular-nums leading-tight ${i === 0 ? "text-[28px]" : "text-lg"}`}
              style={{ color: resolveNamedColor(entry.color) }}
            >
              {formatValue(entry.value, entry.format)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        {values.map((entry) => (
          <TrendArrow key={entry.label} deltaPct={entry.wowDeltaPct} positiveIsGood={goalDirection !== "lower"} />
        ))}
      </div>
    </div>
  );
}
