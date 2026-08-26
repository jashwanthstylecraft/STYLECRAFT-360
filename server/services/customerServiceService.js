const repository = require("../data/repository");
const { wowDeltaPct, buildMetric } = require("./metricsHelpers");
const { applyPeriodToDepartment } = require("./aggregate");

function buildSummary(WEEKS, METRICS) {
  const latestIndex = WEEKS.length - 1;
  const bySlug = (slug) => METRICS.find((m) => m.slug === slug);

  const defective = bySlug("defective-returns");
  const customer = bySlug("customer-returns");
  const repair = bySlug("repair-rate");

  const totalReturnsSeries = defective.series.map((v, i) =>
    v === null || v === undefined || customer.series[i] === null || customer.series[i] === undefined
      ? null
      : v + customer.series[i]
  );

  return {
    totalReturns: {
      result: totalReturnsSeries[latestIndex],
      wowDeltaPct: wowDeltaPct(totalReturnsSeries),
    },
    defectiveReturns: {
      result: defective.series[latestIndex],
      wowDeltaPct: wowDeltaPct(defective.series),
    },
    repairRate: {
      value: repair.series[latestIndex],
      wowDeltaPct: wowDeltaPct(repair.series),
    },
  };
}

function getCustomerServiceMetrics(period, range) {
  const raw = repository.getDepartmentData("customer-service", range);
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

module.exports = { getCustomerServiceMetrics };
