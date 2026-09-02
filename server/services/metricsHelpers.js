// Shared math for the Phase 2 department services (inventory/finance/operations).
// salesService.js intentionally keeps its own copies of these — Phase 1
// behavior must stay byte-for-byte unchanged, so it isn't refactored onto
// this shared module.
const repository = require("../data/repository");

function attainmentPct(result, goal) {
  if (result === null || result === undefined) return null;
  if (goal === null || goal === undefined) return null;
  if (goal === 0) return result === 0 ? 100 : null; // % of a zero goal is undefined; callers special-case this
  return (result / goal) * 100;
}

// A real zero prior value is NOT "missing data" — `!prior` used to treat
// them identically, silently blanking the WoW arrow whenever last week was
// genuinely 0 (e.g. a metric's first-ever nonzero week) instead of showing
// the change. `latest === prior` short-circuits 0-to-0 (and any exact
// repeat) to a clean 0 before the division. A real 0-to-N move can't express
// a finite percent, and true `Infinity` doesn't survive JSON (it silently
// becomes `null`, indistinguishable from missing data on the wire) — so we
// send this sentinel instead; the client (TrendArrow.jsx) renders anything
// this large as "New" rather than a literal percentage.
const WOW_NEW_SENTINEL = 1e6;

function wowDeltaPct(series) {
  if (!Array.isArray(series) || series.length < 2) return null;
  const latest = series[series.length - 1];
  const prior = series[series.length - 2];
  if (latest === null || latest === undefined || prior === null || prior === undefined) return null;
  if (latest === prior) return 0;
  if (prior === 0) return latest > 0 ? WOW_NEW_SENTINEL : -WOW_NEW_SENTINEL;
  return ((latest - prior) / prior) * 100;
}

// Point delta (not percent-of-change) — for series that are already a
// percentage or a ratio, where the WoW move reads better in raw points.
function wowPointDelta(series) {
  if (!Array.isArray(series) || series.length < 2) return null;
  const latest = series[series.length - 1];
  const prior = series[series.length - 2];
  if (latest === null || latest === undefined || prior === null || prior === undefined) return null;
  return latest - prior;
}

// A whole week can now be missing entirely (sparse storage + wider
// requested ranges than a metric's real data coverage), not just an
// individual sub-key — point itself may be null.
function seriesForKey(metric, key) {
  return metric.series.map((point) => point?.[key] ?? null);
}

function sumStackAt(metric, index) {
  const point = metric.series[index];
  if (!point) return null;
  return metric.stackKeys.reduce((sum, key) => sum + (point[key] ?? 0), 0);
}

// The single numeric series a metric's headline "result" is drawn from —
// handles plain arrays, stacked (sum of stack keys), and dual-series metrics
// (which have no single combined result, so return null; callers use
// seriesForKey per series instead).
function resultSeriesFor(metric) {
  if (metric.stackKeys) {
    return metric.series.map((_, i) => sumStackAt(metric, i));
  }
  if (metric.groupKeys) {
    return null;
  }
  return metric.series;
}

function sumAt(seriesList, index) {
  return seriesList.reduce((sum, series) => sum + (series[index] ?? 0), 0);
}

// Combine several per-week values that may each independently be missing —
// missing values don't count toward the total, but a week where EVERY input
// is missing must stay missing (null), not collapse to a fabricated 0.
function sumOrNull(...values) {
  const present = values.filter((v) => v !== null && v !== undefined);
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0);
}

function avgOrNull(...values) {
  const present = values.filter((v) => v !== null && v !== undefined);
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0) / present.length;
}

// Shared across inventory/finance/operations: metrics either carry a single
// result/goal (most bar-family charts) or a `headerValues` pair keyed by
// stackKeys/groupKeys (dualGrouped, and the social stacked chart) — never
// both, so the two branches don't overlap.
function buildMetric(metric) {
  const latestIndex = metric.series.length - 1;

  if (Array.isArray(metric.headerValues)) {
    const keys = metric.stackKeys || metric.groupKeys;
    const headerValues = metric.headerValues.map((headerValue, i) => {
      const series = seriesForKey(metric, keys[i]);
      return {
        ...headerValue,
        value: series[latestIndex],
        wowDeltaPct: wowDeltaPct(series),
      };
    });
    return { ...metric, headerValues };
  }

  const resultSeries = resultSeriesFor(metric);
  const result = resultSeries[latestIndex];
  const goal = metric.goal;

  return {
    ...metric,
    result,
    attainmentPct: attainmentPct(result, goal),
    wowDeltaPct: wowDeltaPct(resultSeries),
  };
}

const LATEST_WEEK_SUMMARY_KEYS = [
  "result",
  "goal",
  "attainmentPct",
  "wowDeltaPct",
  "headerValues",
  "preorderTotal",
  "backorderTotal",
  "preorderWowDeltaPct",
  "backorderWowDeltaPct",
];

// The Result/Goal box (and its attainment/WoW pills) a card or the detail
// page shows must always reflect the single latest real week, independent
// of whatever period/range a caller requested for the CHART itself —
// buildMetric's `result`/`goal` come from `series[series.length - 1]`,
// which is the requested period/range's own last point: a "Quarterly" view
// turns that into a quarter's sum, and an "All time" range can run past the
// last real data into weeks with no result (null) or pick up a goal
// pre-filled months ahead of anything reported. Recomputing against the
// department's own default (always latest-week-anchored) window and
// overlaying just the summary fields — never the chart's own
// series/goalSeries — fixes both without the chart losing the range/period
// the reader actually asked to see.
function withLatestWeekSummary(departmentKey, metrics, buildMetricFn) {
  const latestRaw = repository.getDepartmentData(departmentKey);
  const latestBySlug = new Map(latestRaw.METRICS.map((m) => [m.slug, buildMetricFn(m)]));

  return metrics.map((metric) => {
    const latest = latestBySlug.get(metric.slug);
    if (!latest) return metric;
    const overrides = {};
    for (const key of LATEST_WEEK_SUMMARY_KEYS) {
      if (key in latest) overrides[key] = latest[key];
    }
    return { ...metric, ...overrides };
  });
}

module.exports = {
  attainmentPct,
  wowDeltaPct,
  wowPointDelta,
  seriesForKey,
  resultSeriesFor,
  sumAt,
  sumOrNull,
  avgOrNull,
  buildMetric,
  withLatestWeekSummary,
};
