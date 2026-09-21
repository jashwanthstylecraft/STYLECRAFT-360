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
// best week is the LOWEST value, not the highest. For a "nearest" metric
// (a metric whose real target is a specific number — usually zero — and
// which can legitimately go either above or below it, e.g. Inventory
// Discrepancy), the best week is whichever is CLOSEST to that target
// (`goal`, defaulting to 0) regardless of sign, and the worst is farthest.
function bestWorstWeek(series, weekEndings, weeks, goalDirection, goal = 0) {
  const lowerIsBetter = goalDirection === "lower";
  const nearest = goalDirection === "nearest";
  let best = null;
  let worst = null;

  series.forEach((value, i) => {
    if (!isPresent(value)) return;
    const point = { weekEnding: weekEndings?.[i] ?? null, week: weeks[i], value };
    if (nearest) {
      const dist = Math.abs(value - goal);
      if (!best || dist < Math.abs(best.value - goal)) best = point;
      if (!worst || dist > Math.abs(worst.value - goal)) worst = point;
      return;
    }
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
  // "nearest" (closest-to-target, e.g. Inventory Discrepancy) has no
  // principled binary hit/miss without an arbitrary tolerance band, so it
  // deliberately reports no verdict rather than guess one — this only
  // matters if such a metric ever gets real per-week goal data (currently
  // none do; weeksAtGoalCount/currentStreak below already skip metrics
  // with no goalSeries at all).
  if (goalDirection === "nearest") return null;
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
  const latestIndex = series.length - 1;
  // For "nearest" (closest-to-target), the target is that week's real goal
  // if one exists, else 0 — Inventory Discrepancy has no per-week goal
  // today, so this is 0 in practice (its own stated ideal).
  const nearestTarget = goalSeries?.[latestIndex] ?? 0;
  const { best, worst } = bestWorstWeek(series, weekEndings, weeks, goalDirection, nearestTarget);
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
  const topGoalLabel = metric.goalLabel || "Goal";

  if (metric.stackKeys) {
    return [
      {
        key: null,
        label: null,
        format: metric.headerValues?.[0]?.format ?? topFormat,
        goalDirection: metric.goalDirection,
        goalLabel: topGoalLabel,
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
    // Most groupKeys metrics share one direction across all their series
    // (metric.goalDirection). A few — Pre-orders/Backorders — have series
    // that go opposite ways, declared via groupGoalDirections (parallel to
    // groupKeys); falls back to the metric-level direction when absent.
    const directions = metric.groupGoalDirections ?? keys.map(() => metric.goalDirection);
    return keys.map((key, i) => ({
      key,
      label: labels[i] ?? humanizeKey(key),
      format: formats[i] ?? topFormat,
      goalDirection: directions[i] ?? metric.goalDirection,
      goalLabel: topGoalLabel,
      series: metric.series.map((point) => point?.[key] ?? null),
      goalSeries: undefined, // groupKeys metrics use a fixed targetLine, not a per-week goal series
    }));
  }

  return [
    {
      key: null,
      label: null,
      format: topFormat,
      goalDirection: metric.goalDirection,
      goalLabel: topGoalLabel,
      series: metric.series,
      goalSeries: metric.goalSeries,
    },
  ];
}

// Full detail-stats payload for one metric — an array of one block (plain
// metrics) or several (groupKeys metrics), each tagged with its series key
// so the client knows which named sub-series a block belongs to.
function buildDetailStats(metric, weeks, weekEndings) {
  const resolved = resolveSeries(metric);
  return resolved.map(({ key, label, format, goalDirection, series, goalSeries }) => ({
    key,
    label,
    format,
    goalDirection,
    ...computeSeriesStats({
      series,
      goalSeries,
      weekEndings,
      weeks,
      aggregationMethod: metric.aggregationMethod,
      goalDirection,
    }),
  }));
}

// A block's YTD goal: the real per-week goal series aggregated the same
// way as the result, OR — when a metric has no real goal data but does
// have a fixed weekly targetLine (e.g. New Social Follow/Subs' 3,500/week
// target) — that targetLine used as a stand-in, scaled to match what the
// result side actually aggregates: multiplied by the number of weeks that
// have a real result for a "sum" metric (comparing like-for-like
// accumulated totals), or used as-is for an "average" metric (the average
// IS the weekly target, not a multiple of it). Metrics with neither a real
// goal series nor a targetLine still correctly get `null` here.
//
// When a real goalSeries exists, only a week that ALSO has a real result
// counts toward the YTD goal. Goals are routinely pre-filled weeks or
// months ahead of actuals (see setGoalRange in entryService.js), so
// aggregating every entered goal regardless of whether that week's result
// has been entered yet would compare a shorter result window against a
// longer goal window — understating "% of YTD goal" for any department
// whose data entry is behind its own goal-filling, even with nothing
// actually wrong.
function ytdGoalFor(metric, series, goalSeries) {
  if (goalSeries) {
    const comparable = series.map((v, i) => (isPresent(v) ? goalSeries[i] : null));
    return rangeAggregate(comparable, metric.aggregationMethod);
  }
  if (metric.targetLine === undefined || metric.targetLine === null) return null;
  if (metric.aggregationMethod === "average") return metric.targetLine;
  if (metric.aggregationMethod === "sum") {
    const weeksWithResult = series.filter(isPresent).length;
    return weeksWithResult > 0 ? metric.targetLine * weeksWithResult : null;
  }
  return null;
}

// Year-to-date Result vs. Goal, for the fullscreen comparison bar. Only
// meaningful for metrics that are additive/averageable over time — a
// "last"-aggregated snapshot (A/R Total, Inventory Level, ...) can't be
// summed across a year — and for metrics explicitly opted out via
// `showYtd: false` in the registry (a rate/percent metric where an average-
// of-the-year comparison isn't wanted, even though the math itself would
// be sound). Otherwise uses the real per-week goal series where one
// exists, or falls back to a targetLine-derived one (see ytdGoalFor).
// Returns `null` when nothing qualifies, so the client can skip rendering
// the bar entirely.
function buildYtdStats(metric) {
  if (metric.aggregationMethod === "last") return null;
  if (metric.showYtd === false) return null;

  const blocks = resolveSeries(metric)
    .map(({ key, label, format, goalDirection, goalLabel, series, goalSeries }) => ({
      key,
      label,
      format,
      goalDirection,
      goalLabel,
      ytdResult: rangeAggregate(series, metric.aggregationMethod),
      ytdGoal: ytdGoalFor(metric, series, goalSeries),
    }))
    .filter((b) => isPresent(b.ytdResult) && isPresent(b.ytdGoal));

  return blocks.length ? { blocks } : null;
}

// Verified against a real reference methodology (a Google Sheet the
// business already uses for this exact calculation, cross-checked
// byte-for-byte against 53 real weeks of U.S. B2B Invoiced Sales — every
// trailing-13-week sum and every YoY% matched exactly): ROC is the
// year-over-year % change in the TRAILING 13-WEEK SUM, not a single
// week's value shifted by 13 weeks. Concretely, for week i:
//   sum13(i)      = the 13 weeks ending at (and including) week i, summed
//   sum13(i - 52) = the SAME 13-week window, exactly 52 weeks earlier
//   ROC(i)        = (sum13(i) - sum13(i-52)) / sum13(i-52) * 100
// This needs 13 + 52 = 65 weeks of real history before the first week can
// produce a value at all — the caller (detailService.js's rocSeriesWindow)
// fetches that much extra leading history, then trims back to the
// displayed range, same pattern as before.
const ROC_WINDOW_WEEKS = 13;
const ROC_YOY_WEEKS = 52;

// The 13-week window ending at `endIndex`. Any missing week inside that
// window makes the whole sum untrustworthy (silently summing only the
// present weeks would understate it) — returns null rather than a biased
// number.
function trailingSum(series, endIndex, windowSize) {
  const startIndex = endIndex - windowSize + 1;
  if (startIndex < 0) return null;
  let sum = 0;
  for (let j = startIndex; j <= endIndex; j++) {
    if (!isPresent(series[j])) return null;
    sum += series[j];
  }
  return sum;
}

function rollingRoc(series) {
  return series.map((_, i) => {
    const current = trailingSum(series, i, ROC_WINDOW_WEEKS);
    const priorIndex = i - ROC_YOY_WEEKS;
    const prior = priorIndex >= 0 ? trailingSum(series, priorIndex, ROC_WINDOW_WEEKS) : null;
    if (current === null || prior === null || prior === 0) return null;
    return ((current - prior) / prior) * 100;
  });
}

function buildRocSeries(metric) {
  const blocks = resolveSeries(metric).map(({ key, label, series, goalDirection }) => ({
    key,
    label,
    // A "nearest to target" series (e.g. Inventory Discrepancy) is signed —
    // 13 weeks of positive/negative values routinely sum to something near
    // zero, and dividing by a near-zero prior-year base turns ordinary
    // week-to-week noise into a huge, meaningless swing (seen in practice:
    // a -$5,000 prior-year base producing a "280%" reading). ROC as a
    // %-change-of-a-sum has no sound meaning for this kind of series, so it
    // deliberately reports no values rather than a misleading one.
    values: goalDirection === "nearest" ? series.map(() => null) : rollingRoc(series),
  }));

  const hasAny = blocks.some((b) => b.values.some((v) => v !== null));
  return hasAny ? { windowWeeks: ROC_WINDOW_WEEKS, yoyWeeks: ROC_YOY_WEEKS, blocks } : null;
}

module.exports = {
  buildDetailStats,
  buildYtdStats,
  buildRocSeries,
  computeSeriesStats,
  resolveSeries,
  goalHit,
  isPresent,
  humanizeKey,
  movingAverageSeries,
};
