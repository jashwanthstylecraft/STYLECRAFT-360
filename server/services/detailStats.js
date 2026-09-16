// Stats for the Phase 7 metric detail page — everything here is NEW logic
// (best/worst week, moving average, goal-hit streak, coverage), computed
// once here rather than duplicated per department. It operates on a single
// numeric series (already resolved from whatever shape the metric's raw
// data has — plain array, stacked sum, or one named sub-series), never on
// raw department objects, so it works identically for every metric.
const MOVING_AVERAGE_WINDOW = 4;

function isPresent(v) {
  return v !== null && v !== undefined && !Number.isNaN(v);
}

// Fallback display label for a stack/group series key when the registry has
// no `headerValues` for it (only website-sales's stylecraft/gammaPlus keys
// hit this — every other multi-series metric already names its series via
// headerValues). "gammaPlus" -> "Gamma Plus".
function humanizeKey(key) {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// direction-aware: for a "lower is better" metric (a budget/ceiling), the
// best week is the LOWEST value, not the highest.
function bestWorstWeek(series, weekEndings, weeks, goalDirection) {
  const lowerIsBetter = goalDirection === "lower";
  let best = null;
  let worst = null;

  series.forEach((value, i) => {
    if (!isPresent(value)) return;
    const point = { weekEnding: weekEndings?.[i] ?? null, week: weeks[i], value };
    if (!best || (lowerIsBetter ? value < best.value : value > best.value)) best = point;
    if (!worst || (lowerIsBetter ? value > worst.value : value < worst.value)) worst = point;
  });

  return { best, worst };
}

// Average of the last up-to-MOVING_AVERAGE_WINDOW ENTERED weeks ending at
// each index — un-entered weeks are skipped, not treated as zero, so a
// metric with real gaps still gets a meaningful average rather than one
// dragged toward zero by weeks that were never reported.
function movingAverageSeries(series) {
  return series.map((_, i) => {
    const window = [];
    for (let j = i; j >= 0 && window.length < MOVING_AVERAGE_WINDOW; j--) {
      if (isPresent(series[j])) window.push(series[j]);
    }
    if (window.length === 0) return null;
    return window.reduce((a, b) => a + b, 0) / window.length;
  });
}

function goalHit(value, goal, goalDirection) {
  if (!isPresent(value) || !isPresent(goal)) return null;
  return goalDirection === "lower" ? value <= goal : value >= goal;
}

function weeksAtGoalCount(series, goalSeries, goalDirection) {
  if (!goalSeries) return null;
  let count = 0;
  series.forEach((value, i) => {
    if (goalHit(value, goalSeries[i], goalDirection) === true) count++;
  });
  return count;
}

// Walks backward from the most recent ENTERED week (skipping weeks with no
// value/goal entirely — an un-entered week neither extends nor breaks a
// streak, since it isn't a result one way or the other) counting consecutive
// hit/miss weeks of the same kind.
function currentStreak(series, goalSeries, goalDirection) {
  if (!goalSeries) return null;
  let type = null;
  let count = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    const hit = goalHit(series[i], goalSeries[i], goalDirection);
    if (hit === null) continue;
    const kind = hit ? "hit" : "miss";
    if (type === null) {
      type = kind;
      count = 1;
    } else if (kind === type) {
      count++;
    } else {
      break;
    }
  }
  return type ? { type, count } : null;
}

function rangeAggregate(series, aggregationMethod) {
  const present = series.filter(isPresent);
  if (present.length === 0) return null;
  if (aggregationMethod === "sum") return present.reduce((a, b) => a + b, 0);
  if (aggregationMethod === "average") return present.reduce((a, b) => a + b, 0) / present.length;
  if (aggregationMethod === "last") return present[present.length - 1];
  return null;
}

function coverage(series) {
  return { entered: series.filter(isPresent).length, total: series.length };
}

// One full stats block for a single numeric series (weekly, chronological).
function computeSeriesStats({ series, goalSeries, weekEndings, weeks, aggregationMethod, goalDirection }) {
  const { best, worst } = bestWorstWeek(series, weekEndings, weeks, goalDirection);
  const latestIndex = series.length - 1;
  const priorIndex = latestIndex - 1;

  return {
    latest: {
      value: series[latestIndex] ?? null,
      goal: goalSeries?.[latestIndex] ?? null,
      weekEnding: weekEndings?.[latestIndex] ?? null,
    },
    periodDelta:
      isPresent(series[latestIndex]) && isPresent(series[priorIndex]) && series[priorIndex] !== 0
        ? ((series[latestIndex] - series[priorIndex]) / series[priorIndex]) * 100
        : null,
    rangeAggregate: { method: aggregationMethod, value: rangeAggregate(series, aggregationMethod) },
    bestWeek: best,
    worstWeek: worst,
    movingAverage: movingAverageSeries(series),
    movingAverageWindow: MOVING_AVERAGE_WINDOW,
    weeksAtGoal: weeksAtGoalCount(series, goalSeries, goalDirection),
    streak: currentStreak(series, goalSeries, goalDirection),
    coverage: coverage(series),
  };
}

// Resolves a metric's raw per-week values into either ONE numeric series
// (plain metrics, and stacked metrics via their sum) or several NAMED
// series (groupKeys metrics with no single combined result, e.g. Shipping
// Time B2B/B2C) — mirrors resultSeriesFor's split in metricsHelpers.js, but
// that helper returns null for groupKeys metrics rather than per-key series,
// which is exactly the case the detail page needs stats for.
function resolveSeries(metric) {
  const topFormat = metric.format || "currency";

  if (metric.stackKeys) {
    return [
      {
        key: null,
        label: null,
        format: metric.headerValues?.[0]?.format ?? topFormat,
        series: metric.series.map((point) => {
          if (!point) return null;
          const values = metric.stackKeys.map((k) => point[k]).filter(isPresent);
          return values.length ? values.reduce((a, b) => a + b, 0) : null;
        }),
        goalSeries: metric.goalSeries,
      },
    ];
  }

  if (metric.groupKeys) {
    const keys = metric.groupKeys;
    const labels = metric.headerValues?.map((h) => h.label) ?? keys;
    const formats = metric.headerValues?.map((h) => h.format) ?? keys.map(() => topFormat);
    return keys.map((key, i) => ({
      key,
      label: labels[i] ?? humanizeKey(key),
      format: formats[i] ?? topFormat,
      series: metric.series.map((point) => point?.[key] ?? null),
      goalSeries: undefined, // groupKeys metrics use a fixed targetLine, not a per-week goal series
    }));
  }

  return [{ key: null, label: null, format: topFormat, series: metric.series, goalSeries: metric.goalSeries }];
}

// Full detail-stats payload for one metric — an array of one block (plain
// metrics) or several (groupKeys metrics), each tagged with its series key
// so the client knows which named sub-series a block belongs to.
function buildDetailStats(metric, weeks, weekEndings) {
  const resolved = resolveSeries(metric);
  return resolved.map(({ key, label, format, series, goalSeries }) => ({
    key,
    label,
    format,
    ...computeSeriesStats({
      series,
      goalSeries,
      weekEndings,
      weeks,
      aggregationMethod: metric.aggregationMethod,
      goalDirection: metric.goalDirection,
    }),
  }));
}

// Year-to-date Result vs. Goal, for the fullscreen comparison bar. Only
// meaningful for metrics that are additive/averageable over time — a
// "last"-aggregated snapshot (A/R Total, Inventory Level, ...) can't be
// summed across a year — and only for series that actually have a real
// per-week goal to compare against (resolveSeries already returns
// `goalSeries: undefined` for groupKeys metrics, which use headerValues/
// targetLine instead; a stackKeys metric with no goal column in the source
// sheet just aggregates to `null`, filtered out below). Returns `null` when
// nothing qualifies, so the client can skip rendering the bar entirely.
function buildYtdStats(metric) {
  if (metric.aggregationMethod === "last") return null;

  const blocks = resolveSeries(metric)
    .map(({ key, label, format, series, goalSeries }) => ({
      key,
      label,
      format,
      ytdResult: rangeAggregate(series, metric.aggregationMethod),
      ytdGoal: goalSeries ? rangeAggregate(goalSeries, metric.aggregationMethod) : null,
    }))
    .filter((b) => isPresent(b.ytdResult) && isPresent(b.ytdGoal));

  return blocks.length ? { blocks } : null;
}

// 13/26/39-week Percent Rate of Change — "how fast is this metric moving"
// at three lookback horizons (the weekly-calendar equivalent of the usual
// 3/6/9-month momentum windows: 13 weeks/quarter). Unlike buildYtdStats,
// this is NOT limited to "last"-aggregated metrics — it compares two point
// values (now vs. N weeks ago), which is meaningful for a snapshot/balance
// metric (e.g. "Inventory Level is up 12% over the last 26 weeks") just as
// much as a summable one. Always a percent, regardless of the metric's own
// display format, so blocks carry no `format` field.
const ROC_LOOKBACKS = [
  { key: "roc13Week", label: "13-Week", weeks: 13 },
  { key: "roc26Week", label: "26-Week", weeks: 26 },
  { key: "roc39Week", label: "39-Week", weeks: 39 },
];

function percentRocAt(series, weeksBack) {
  const latestIndex = series.length - 1;
  const pastIndex = latestIndex - weeksBack;
  if (latestIndex < 0 || pastIndex < 0) return null;
  const current = series[latestIndex];
  const past = series[pastIndex];
  if (!isPresent(current) || !isPresent(past) || past === 0) return null;
  return ((current - past) / past) * 100;
}

// `metric` must carry enough weekly history to look ROC_LOOKBACKS' furthest
// (39) weeks back — see rocRange() in detailService.js, which fetches a
// wide-enough window independent of whatever period/range the chart itself
// is showing (same reasoning as buildYtdStats' ytdRange). A lookback with
// no real data that far back returns null for just that one period, not
// the whole block — early weeks of a metric's history legitimately don't
// have a 39-week-ago value yet.
function buildRocStats(metric) {
  const blocks = resolveSeries(metric).map(({ key, label, series }) => ({
    key,
    label,
    periods: ROC_LOOKBACKS.map(({ key: periodKey, label: periodLabel, weeks }) => ({
      key: periodKey,
      label: periodLabel,
      weeks,
      value: percentRocAt(series, weeks),
    })),
  }));

  const hasAny = blocks.some((b) => b.periods.some((p) => p.value !== null));
  return hasAny ? { blocks } : null;
}

module.exports = {
  buildDetailStats,
  buildYtdStats,
  buildRocStats,
  computeSeriesStats,
  resolveSeries,
  goalHit,
  isPresent,
  humanizeKey,
  movingAverageSeries,
};
