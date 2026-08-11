import { formatCurrencyFull, formatPercentFraction, formatDecimal, formatCount } from "../../utils/format";

function formatRowValue(value, valueFormat) {
  switch (valueFormat) {
    case "percent":
      return formatPercentFraction(value, { decimals: 1 });
    case "decimal":
      return formatDecimal(value, 2);
    case "count":
      return formatCount(value);
    case "currency":
    default:
      return formatCurrencyFull(value);
  }
}

// Shared tooltip shell for all chart variants: value leads (Strong), series
// name follows (secondary) — the legend's hierarchy inverted, per dataviz
// convention, since the reader already has the series and wants the number.
// A row with value === null/undefined renders "No data" rather than a
// fabricated $0 — a missing week and a real zero must never look the same.
export default function ChartTooltip({ active, label, rows, valueFormat = "currency" }) {
  if (!active || !rows?.length) return null;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 shadow-lg">
      <div className="mb-1.5 text-xs font-semibold text-ink-secondary">{label}</div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-ink-secondary">
              <span
                className="inline-block"
                style={
                  row.shape === "line"
                    ? { width: 10, height: 2, backgroundColor: row.color }
                    : { width: 8, height: 8, borderRadius: 2, backgroundColor: row.color }
                }
              />
              {row.label}
            </span>
            {row.value === null || row.value === undefined ? (
              <span className="italic text-ink-muted">No data</span>
            ) : (
              <span className="font-semibold tabular-nums text-ink">
                {formatRowValue(row.value, row.valueFormat ?? valueFormat)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
