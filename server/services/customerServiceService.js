const repository = require("../data/repository");
const { buildMetric, withLatestWeekSummary } = require("./metricsHelpers");
const { applyPeriodToDepartment } = require("./aggregate");

// Customer Service has no metrics of its own right now (all three moved to
// Operations — see shared/metricRegistry.mjs) — no summary to compute. Kept
// as a function (rather than removed outright) so the department can grow a
// real summary again once it has metrics.
function buildSummary() {
  return {};
}

function getCustomerServiceMetrics(period, range) {
  const raw = repository.getDepartmentData("customer-service", range);
  const { WEEKS, WEEK_ENDINGS, AS_OF, METRICS, period: resolvedPeriod } = applyPeriodToDepartment(raw, period);
  return {
    asOf: AS_OF,
    weeks: WEEKS,
    weekEndings: WEEK_ENDINGS,
    period: resolvedPeriod,
    metrics: withLatestWeekSummary("customer-service", METRICS.map(buildMetric), buildMetric),
    summary: buildSummary(WEEKS, METRICS),
    isSampleData: repository.isUsingSampleData(),
  };
}

module.exports = { getCustomerServiceMetrics };
