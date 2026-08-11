import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatWeekEndingLabel } from "../../utils/weekCalendar";

const HEADER_HEIGHT = 28;
const ROW_HEIGHT = 40;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthYearLabel(weekEnding) {
  const [year, month] = weekEnding.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

// Flattens the 231-week coverage list into a single array of header + week
// rows so one virtualizer can scroll through both — true CSS sticky headers
// don't compose with absolutely-positioned virtual rows, so instead we track
// which header is topmost via scroll offset and render it as a separate
// overlay bar (see currentHeaderLabel below).
function buildRows(weeks) {
  const rows = [];
  let lastMonth = null;
  for (const week of weeks) {
    const label = monthYearLabel(week.weekEnding);
    if (label !== lastMonth) {
      rows.push({ type: "header", label, key: `h-${label}` });
      lastMonth = label;
    }
    rows.push({ type: "week", week, key: week.weekEnding });
  }
  return rows;
}

function CoverageDot({ metricsWithData, totalMetrics }) {
  if (!metricsWithData) {
    return <span className="h-2 w-2 rounded-full border border-ink-muted/40" />;
  }
  const full = metricsWithData >= totalMetrics;
  return (
    <span
      className={`h-2 w-2 rounded-full ${full ? "bg-positive" : "bg-amber-500"}`}
      title={`${metricsWithData}/${totalMetrics} metrics recorded`}
    />
  );
}

export default function WeekList({ weeks, totalMetrics, currentWeekEnding, selectedWeekEnding, onSelectWeek }) {
  const rows = useMemo(() => buildRows(weeks), [weeks]);
  const scrollRef = useRef(null);
  const [currentHeaderLabel, setCurrentHeaderLabel] = useState(rows[0]?.type === "header" ? rows[0].label : "");

  const offsets = useMemo(() => {
    const cumulative = [];
    let total = 0;
    for (const row of rows) {
      cumulative.push(total);
      total += row.type === "header" ? HEADER_HEIGHT : ROW_HEIGHT;
    }
    return cumulative;
  }, [rows]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (rows[i].type === "header" ? HEADER_HEIGHT : ROW_HEIGHT),
    overscan: 12,
  });

  function updateCurrentHeader(scrollTop) {
    // Binary search for the last header row whose offset is <= scrollTop.
    let lo = 0;
    let hi = rows.length - 1;
    let found = rows[0]?.type === "header" ? rows[0].label : "";
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid] <= scrollTop) {
        if (rows[mid].type === "header") found = rows[mid].label;
        else {
          for (let j = mid; j >= 0; j--) {
            if (rows[j].type === "header") {
              found = rows[j].label;
              break;
            }
          }
        }
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    setCurrentHeaderLabel(found);
  }

  // Set scrollTop directly on mount rather than via virtualizer.scrollToIndex
  // — on the very first render the virtualizer's scroll-element listener
  // hasn't attached yet (scrollRef.current is still null when useVirtualizer
  // first resolves getScrollElement), so scrollToIndex silently computed a
  // target against nothing. Setting the real DOM scrollTop directly always
  // works, and the updateCurrentHeader() state update right after forces
  // the virtualizer to recompute its visible range against the new offset.
  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (didInitialScroll.current || !selectedWeekEnding || rows.length === 0 || !scrollRef.current) return;
    const index = rows.findIndex((r) => r.type === "week" && r.week.weekEnding === selectedWeekEnding);
    if (index >= 0) {
      const el = scrollRef.current;
      const targetTop = Math.max(0, offsets[index] - el.clientHeight / 2 + ROW_HEIGHT / 2);
      el.scrollTop = targetTop;
      didInitialScroll.current = true;
      updateCurrentHeader(el.scrollTop);
    }
  }, [selectedWeekEnding, rows, offsets]);

  useEffect(() => {
    if (!didInitialScroll.current || !selectedWeekEnding || !scrollRef.current) return;
    const index = rows.findIndex((r) => r.type === "week" && r.week.weekEnding === selectedWeekEnding);
    if (index < 0) return;
    const el = scrollRef.current;
    const rowTop = offsets[index];
    const rowBottom = rowTop + ROW_HEIGHT;
    if (rowTop < el.scrollTop || rowBottom > el.scrollTop + el.clientHeight) {
      el.scrollTop = Math.max(0, rowTop - el.clientHeight / 2 + ROW_HEIGHT / 2);
      updateCurrentHeader(el.scrollTop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekEnding]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
      <div className="flex items-center border-b border-surface-border bg-surface-hover px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {currentHeaderLabel || "Weeks"}
      </div>
      <div ref={scrollRef} onScroll={(e) => updateCurrentHeader(e.currentTarget.scrollTop)} className="min-h-0 flex-1 overflow-y-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const style = {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            };

            if (row.type === "header") {
              return (
                <div key={row.key} style={style} className="flex items-center px-4 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  {row.label}
                </div>
              );
            }

            const { week } = row;
            const isSelected = week.weekEnding === selectedWeekEnding;
            const isCurrent = week.weekEnding === currentWeekEnding;
            const isFuture = week.weekEnding > currentWeekEnding;

            return (
              <button
                key={row.key}
                style={style}
                onClick={() => onSelectWeek(week.weekEnding)}
                className={`flex w-full items-center justify-between px-4 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-actual/10 font-semibold text-actual"
                    : isFuture
                      ? "text-ink-muted hover:bg-surface-hover"
                      : "text-ink hover:bg-surface-hover"
                }`}
              >
                <span className="flex items-center gap-2">
                  {isCurrent && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-actual" title="Current week" />}
                  <span className={isFuture ? "opacity-70" : ""}>{formatWeekEndingLabel(week.weekEnding)}</span>
                </span>
                <CoverageDot metricsWithData={week.metricsWithData} totalMetrics={totalMetrics} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
