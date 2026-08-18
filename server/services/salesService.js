const repository = require("../data/repository");
const { applyPeriodToDepartment } = require("./aggregate");

// result/goal in the API always reflect the latest week, derived here so the
// frontend never recomputes business logic — it only renders what it's given.
function attainmentPct(result, goal) {
  if (result === null || result === undefined) return null;
  if (goal === null || goal === undefined) return null;
  if (goal === 0) return result === 0 ? 100 : null; // % of a zero goal is undefined; callers special-case this
  return (result / goal) * 100;
}

// A real zero prior value is NOT "missing data" — `!prior` used to treat
// them identically, silently blanking the WoW arrow whenever last week was
// genuinely 0 instead of showing the change. `latest === prior` short-
// circuits 0-to-0 to a clean 0 before the division. A real 0-to-N move can't
// express a finite percent, and true `Infinity` doesn't survive JSON (it
// silently becomes `null`, indistinguishable from missing data on the wire)
// — so we send this sentinel instead; the client (TrendArrow.jsx) renders
// anything this large as "New" rather than a literal percentage.
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

// Point delta (not percent-of-change) — used for attainment%, which is
// already a percentage, so its WoW move is expressed in percentage points.
function wowPointDelta(series) {
  if (!Array.isArray(series) || series.length < 2) return null;
  const latest = series[series.length - 1];
  const prior = series[series.length - 2];
  if (latest === null || prior === null || latest === undefined || prior === undefined) return null;
  return latest - prior;
}

function resultSeriesFor(metric) {
  if (metric.chartType === "stacked") {
    return metric.series.map((point) => {
      if (!point) return null;
      return metric.stackKeys.reduce((sum, key) => sum + (point[key] ?? 0), 0);
    });
  }
  return metric.series;
}

// Missing values don't count toward the total, but a week where EVERY
// input is missing (e.g. the tail of a very wide "All time" range, past
// the last real data) must stay missing — never collapse to a fabricated 0.
function sumAt(seriesList, index) {
  const present = seriesList.map((series) => series[index]).filter((v) => v !== null && v !== undefined);
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0);
}

function buildMetric(metric) {
  const latestIndex = metric.series.length - 1;

  if (metric.chartType === "grouped") {
    const preorderSeries = metric.series.map((point) => point?.preorder ?? null);
    const backorderSeries = metric.series.map((point) => point?.backorder ?? null);
    return {
      ...metric,
      preorderTotal: preorderSeries[latestIndex],
      backorderTotal: backorderSeries[latestIndex],
      preorderWowDeltaPct: wowDeltaPct(preorderSeries),
      backorderWowDeltaPct: wowDeltaPct(backorderSeries),
    };
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

function buildSummary(WEEKS, METRICS) {
  const latestIndex = WEEKS.length - 1;
  const bySlug = (slug) => METRICS.find((m) => m.slug === slug);

  const invoicedSeriesList = ["us-b2b-invoiced", "intl-b2b-invoiced"].map((slug) =>
    resultSeriesFor(bySlug(slug))
  );
  const totalInvoicedSeries = WEEKS.map((_, i) => sumAt(invoicedSeriesList, i));

  const d2cSeriesList = ["ecommerce-ex-website", "website-sales", "johnny-b-b2c"].map((slug) =>
    resultSeriesFor(bySlug(slug))
  );
  const totalD2CSeries = WEEKS.map((_, i) => sumAt(d2cSeriesList, i));

  const goalBearingMetrics = METRICS.filter((m) => m.chartType !== "grouped");
  const totalResultSeries = WEEKS.map((_, i) => sumAt(goalBearingMetrics.map(resultSeriesFor), i));
  const totalGoalSeries = WEEKS.map((_, i) => sumAt(goalBearingMetrics.map((m) => m.goalSeries), i));
  const attainmentSeries = totalResultSeries.map((result, i) => attainmentPct(result, totalGoalSeries[i]));

  const backorderSeries = bySlug("preorders-backorders").series.map((point) => point?.backorder ?? null);

  return {
    totalInvoiced: {
      result: totalInvoicedSeries[latestIndex],
      wowDeltaPct: wowDeltaPct(totalInvoicedSeries),
    },
    totalD2C: {
      result: totalD2CSeries[latestIndex],
      wowDeltaPct: wowDeltaPct(totalD2CSeries),
    },
    overallAttainmentPct: {
      value: attainmentSeries[latestIndex],
      wowPointDelta: wowPointDelta(attainmentSeries),
    },
    openBackorders: {
      result: backorderSeries[latestIndex],
      wowDeltaPct: wowDeltaPct(backorderSeries),
    },
  };
}

function getSalesMetrics(period, range) {
  const raw = repository.getDepartmentData("sales", range);
  const { WEEKS, WEEK_ENDINGS, AS_OF, METRICS, period: resolvedPeriod } = applyPeriodToDepartment(raw, period);
  return {
    asOf: AS_OF,
    weeks: WEEKS,
    weekEndings: WEEK_ENDINGS,
    period: resolvedPeriod,
    metrics: METRICS.map(buildMetric),
    summary: buildSummary(WEEKS, METRICS),
    isSampleData: repository.isUsingSampleData(),
  };
}

module.exports = { getSalesMetrics, buildMetric, buildSummary };
