import { useState } from "react";
import { formatValue } from "../../../utils/format";
import { useChartColors } from "../../../utils/theme";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MAX_WEEKS_PER_MONTH = 5;
const CELL_SIZE = 16;

// Months as columns (chronological, scrollable), week-of-month as rows —
// the classic "contribution graph" layout, which is what makes multi-year
// seasonality actually readable at a glance instead of one giant grid.
function bucketByMonth(cells) {
  const months = [];
  const byKey = new Map();
  for (const cell of cells) {
    const key = `${cell.year}-${cell.month}`;
    if (!byKey.has(key)) {
      const bucket = { key, year: cell.year, month: cell.month, weeks: [] };
      byKey.set(key, bucket);
      months.push(bucket);
    }
    byKey.get(key).weeks.push(cell);
  }
  return months;
}

// A label on the first column and on every January — enough to place year
// boundaries without labeling all ~53 months, which would just be noise at
// 16px-wide columns.
function labelFor(month, isFirst) {
  if (isFirst) return `${MONTH_ABBR[month.month - 1]} '${String(month.year).slice(2)}`;
  if (month.month === 1) return `'${String(month.year).slice(2)}`;
  return "";
}

function colorFor(value, min, max, colors) {
  if (value === null || value === undefined) return colors.gridline;
  if (max === min) return colors.actual;
  const t = (value - min) / (max - min); // 0..1
  // Interpolate lightness by mixing the actual color with the card background.
  const alpha = 0.15 + t * 0.85;
  return colors.actual + Math.round(alpha * 255).toString(16).padStart(2, "0");
}

export default function MonthHeatmap({ data }) {
  const COLORS = useChartColors();
  const { format, cells } = data;
  const [hovered, setHovered] = useState(null);
  const months = bucketByMonth(cells);
  const values = cells.map((c) => c.value).filter((v) => v !== null && v !== undefined);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-[3px]">
          {months.map((month, mi) => (
            <div key={month.key} className="flex flex-col gap-[3px]" style={{ width: CELL_SIZE }}>
              <div className="mb-0.5 text-center text-[9px] text-ink-muted">{labelFor(month, mi === 0)}</div>
              {Array.from({ length: MAX_WEEKS_PER_MONTH }).map((_, i) => {
                const cell = month.weeks[i];
                if (!cell) return <div key={i} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                return (
                  <div
                    key={i}
                    className="cursor-default rounded-sm"
                    style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: colorFor(cell.value, min, max, COLORS) }}
                    onMouseEnter={() => setHovered(cell)}
                    onMouseLeave={() => setHovered((h) => (h === cell ? null : h))}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 h-5 text-xs text-ink-secondary">
        {hovered ? (
          <span>
            <span className="font-medium text-ink">{hovered.weekEnding}</span>: {hovered.value === null || hovered.value === undefined ? "No data" : formatValue(hovered.value, format)}
          </span>
        ) : (
          <span className="text-ink-muted">Hover a week for its value</span>
        )}
      </div>
    </div>
  );
}
