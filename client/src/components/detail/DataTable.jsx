import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatValue, formatPercent } from "../../utils/format";
import { formatWeekEndingLabel } from "../../utils/weekCalendar";

const ROW_HEIGHT = 36;
const VIRTUALIZE_THRESHOLD = 60;

function HitDot({ hit }) {
  if (hit === null || hit === undefined) return <span className="text-ink-muted">—</span>;
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${hit ? "bg-positive" : "bg-negative"}`}
      title={hit ? "Hit goal" : "Missed goal"}
    />
  );
}

function cellValue(value, format) {
  return value === null || value === undefined ? <span className="text-ink-muted">—</span> : formatValue(value, format);
}

// groupKeys/stackKeys metrics carry their own format per sub-series in
// registry `headerValues` (e.g. Shipping Time's days are "decimal", not the
// metric-level default) — value/total/goal columns fall back to the metric's
// own top-level format since those are never true multi-format columns.
function formatForColumn(metric, col, fallbackFormat) {
  if (col.key.startsWith("series:") && metric.headerValues) {
    const seriesKey = col.key.slice("series:".length);
    const i = (metric.groupKeys || metric.stackKeys || []).indexOf(seriesKey);
    return metric.headerValues[i]?.format ?? fallbackFormat;
  }
  return fallbackFormat;
}

// Column plan derived from the metric's shape, not hardcoded per metric —
// works for plain value/goal metrics, stacked (per-series + computed
// total), and groupKeys (per-series, no combined result/goal) alike.
function buildColumns(metric, hasGoal) {
  const columns = [{ key: "week", label: "Week Ending" }];
  if (metric.groupKeys) {
    metric.groupKeys.forEach((key, i) => columns.push({ key: `series:${key}`, label: metric.headerValues?.[i]?.label ?? key }));
    return columns;
  }
  if (metric.stackKeys) {
    metric.stackKeys.forEach((key, i) => columns.push({ key: `series:${key}`, label: metric.headerValues?.[i]?.label ?? key }));
    columns.push({ key: "total", label: "Total" });
  } else {
    columns.push({ key: "value", label: "Value" });
  }
  if (hasGoal) {
    columns.push({ key: "goal", label: "Goal" }, { key: "variance", label: "Variance" }, { key: "variancePct", label: "Var %" }, { key: "hit", label: "" });
  }
  return columns;
}

// Plain-text version of a cell, for CSV export — mirrors Row's rendering
// exactly (same columns, same source fields) so "exact table contents" holds.
function cellText(row, col, metric, fallbackFormat) {
  const format = formatForColumn(metric, col, fallbackFormat);
  if (col.key === "week") return formatWeekEndingLabel(row.weekEnding);
  if (col.key === "value") return row.value === null || row.value === undefined ? "" : formatValue(row.value, format);
  if (col.key === "total") return row.total === null || row.total === undefined ? "" : formatValue(row.total, format);
  if (col.key === "goal") return row.goal === null || row.goal === undefined ? "" : formatValue(row.goal, format);
  if (col.key === "variance") return row.variance === null || row.variance === undefined ? "" : formatValue(row.variance, format);
  if (col.key === "variancePct") return row.variancePct === null || row.variancePct === undefined ? "" : formatPercent(row.variancePct, { signed: true });
  if (col.key === "hit") return row.hit === null || row.hit === undefined ? "" : row.hit ? "Hit" : "Miss";
  if (col.key.startsWith("series:")) {
    const seriesKey = col.key.slice("series:".length);
    const entry = row.perSeries?.find((s) => s.key === seriesKey);
    return entry?.value === null || entry?.value === undefined ? "" : formatValue(entry.value, format);
  }
  return "";
}

export function buildCsvRows(metric, rows, format) {
  const hasGoal = rows.some((r) => r.goal !== null && r.goal !== undefined) || (!metric.groupKeys && !metric.stackKeys);
  const columns = buildColumns(metric, hasGoal);
  const headers = columns.map((c) => c.label || "Hit/Miss");
  const body = rows.map((row) => columns.map((col) => cellText(row, col, metric, format)));
  return { headers, body };
}

function Row({ row, columns, metric, format: fallbackFormat, style }) {
  return (
    <div
      className="grid items-center border-b border-surface-border px-3 text-sm last:border-0"
      style={{ ...style, gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((col) => {
        const format = formatForColumn(metric, col, fallbackFormat);
        if (col.key === "week") return <span key={col.key} className="font-medium text-ink">{formatWeekEndingLabel(row.weekEnding)}</span>;
        if (col.key === "value") return <span key={col.key} className="tabular-nums text-ink">{cellValue(row.value, format)}</span>;
        if (col.key === "total") return <span key={col.key} className="tabular-nums font-semibold text-ink">{cellValue(row.total, format)}</span>;
        if (col.key === "goal") return <span key={col.key} className="tabular-nums text-goal">{cellValue(row.goal, format)}</span>;
        if (col.key === "variance") return <span key={col.key} className="tabular-nums text-ink">{cellValue(row.variance, format)}</span>;
        if (col.key === "variancePct") return <span key={col.key} className="tabular-nums text-ink-secondary">{row.variancePct === null || row.variancePct === undefined ? "—" : formatPercent(row.variancePct, { signed: true })}</span>;
        if (col.key === "hit") return <span key={col.key}><HitDot hit={row.hit} /></span>;
        if (col.key.startsWith("series:")) {
          const seriesKey = col.key.slice("series:".length);
          const entry = row.perSeries?.find((s) => s.key === seriesKey);
          return <span key={col.key} className="tabular-nums text-ink">{cellValue(entry?.value, format)}</span>;
        }
        return <span key={col.key} />;
      })}
    </div>
  );
}

export default function DataTable({ metric, rows, format }) {
  const scrollRef = useRef(null);
  const hasGoal = rows.some((r) => r.goal !== null && r.goal !== undefined) || (!metric.groupKeys && !metric.stackKeys);
  const columns = buildColumns(metric, hasGoal);
  const shouldVirtualize = rows.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    enabled: shouldVirtualize,
  });

  // A narrow viewport can't fit 6+ columns without squeezing every value
  // unreadably small — give the table a real minimum width and let it
  // scroll horizontally (spec: "mobile: ... table scrolls") instead.
  const minWidth = columns.length * 110;

  return (
    <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface-card shadow-sm">
      <div style={{ minWidth }}>
        <div
          className="grid border-b border-surface-border bg-surface-hover/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          {columns.map((col) => (
            <span key={col.key}>{col.label}</span>
          ))}
        </div>

        {shouldVirtualize ? (
          <div ref={scrollRef} className="max-h-[560px] overflow-y-auto">
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((vi) => (
                <div key={vi.key} style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${vi.start}px)`, height: ROW_HEIGHT }}>
                  <Row row={rows[vi.index]} columns={columns} metric={metric} format={format} style={{ height: ROW_HEIGHT }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-h-[560px] overflow-y-auto">
            {rows.map((row) => (
              <Row key={row.weekEnding ?? row.week} row={row} columns={columns} metric={metric} format={format} style={{ height: ROW_HEIGHT }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
