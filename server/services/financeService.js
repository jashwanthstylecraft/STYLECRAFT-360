const repository = require("../data/repository");
const { wowDeltaPct, wowPointDelta, buildMetric, withLatestWeekSummary } = require("./metricsHelpers");
const { applyPeriodToDepartment } = require("./aggregate");

function buildSummary(WEEKS, METRICS) {
  const latestIndex = WEEKS.length - 1;
  const bySlug = (slug) => METRICS.find((m) => m.slug === slug);

  const arTotal = bySlug("ar-total");
  const pastDue = bySlug("ar-past-due");
  const margin = bySlug("weekly-gross-margin");

  const pctOfArTotalSeries = pastDue.series.map((v, i) =>
    v === null || v === undefined || !arTotal.series[i] ? null : (v / arTotal.series[i]) * 100
  );
  const varianceSeries = pastDue.series.map((v) => (v === null || v === undefined ? null : v - pastDue.goal));

  return {
    arTotal: {
      result: arTotal.series[latestIndex],
      wowDeltaPct: wowDeltaPct(arTotal.series),
    },
    pastDue: {
      result: pastDue.series[latestIndex],
      wowDeltaPct: wowDeltaPct(pastDue.series),
      pctOfArTotal: pctOfArTotalSeries[latestIndex],
    },
    grossMargin: {
      value: margin.series[latestIndex],
      wowDeltaPct: wowDeltaPct(margin.series),
    },
    pastDueVsBudget: {
      variance: varianceSeries[latestIndex],
      wowPointDelta: wowPointDelta(varianceSeries),
    },
  };
}

function getFinanceMetrics(period, range) {
  const raw = repository.getDepartmentData("finance", range);
  const { WEEKS, WEEK_ENDINGS, AS_OF, METRICS, period: resolvedPeriod } = applyPeriodToDepartment(raw, period);
  return {
    asOf: AS_OF,
    weeks: WEEKS,
    weekEndings: WEEK_ENDINGS,
    period: resolvedPeriod,
    metrics: withLatestWeekSummary("finance", METRICS.map(buildMetric), buildMetric),
    summary: buildSummary(WEEKS, METRICS),
    isSampleData: repository.isUsingSampleData(),
  };
}

module.exports = { getFinanceMetrics };
