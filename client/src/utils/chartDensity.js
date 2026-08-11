// Shared thresholds for wide date ranges (26 weeks up to the full 231-week
// calendar) so every bar chart degrades the same way instead of rendering
// unreadable overlapping labels or hairline bars. These charts only ever
// render inside a KpiCard grid cell (roughly 350-420px wide), not a
// full-width dedicated chart view — at -35deg rotation and 11px type, that
// space fits on the order of 12-14 labels before they start overlapping.
export const LABEL_THIN_THRESHOLD = 7;
export const LINE_FALLBACK_THRESHOLD = 120;

// Recharts' XAxis `interval` is "ticks to skip between shown ticks" (0 =
// show every tick) — convert our "show at most ~40 labels" rule into that.
// `threshold` defaults to the KpiCard-calibrated constant so every existing
// caller is unaffected; a wider chart (the metric detail hero) can pass a
// larger override to keep full labels until many more points are on screen.
export function xAxisInterval(pointCount, threshold = LABEL_THIN_THRESHOLD) {
  if (!pointCount || pointCount <= threshold) return 0;
  return Math.ceil(pointCount / threshold) - 1;
}

export function shouldUseLineFallback(pointCount) {
  return pointCount > LINE_FALLBACK_THRESHOLD;
}
