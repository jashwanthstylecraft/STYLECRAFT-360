const repository = require("../data/repository");
const { buildMetric, withLatestWeekSummary, withYtd, withRoc } = require("./metricsHelpers");
const { applyPeriodToDepartment } = require("./aggregate");

// Customer Service has no metrics of its own right now (all three moved to
// Operations — see shared/metricRegistry.mjs) — no summary to compute. Kept
// as a function (rather than removed outright) so the department can grow a
// real summary again once it has metrics.
function buildSummary() {
  return {};
}

function getCustomerServiceMetrics(period, range, opts = {}) {
  const raw = repository.getDepartmentData("customer-service", range);
  const { WEEKS, WEEK_ENDINGS, AS_OF, METRICS, period: resolvedPeriod } = applyPeriodToDepartment(raw, period);
  let metrics = withLatestWeekSummary("customer-service", METRICS.map(buildMetric), buildMetric);
  if (!opts.skipYtd) {
    metrics = withYtd(metrics, (ytdRange) => getCustomerServiceMetrics("weekly", ytdRange, { skipYtd: true, skipRoc: true }));
  }
  if (!opts.skipRoc) {
    metrics = withRoc(metrics, (rocRange) => getCustomerServiceMetrics("weekly", rocRange, { skipYtd: true, skipRoc: true }));
  }
  return {
    asOf: AS_OF,
    weeks: WEEKS,
    weekEndings: WEEK_ENDINGS,
    period: resolvedPeriod,
    metrics,
    summary: buildSummary(WEEKS, METRICS),
    isSampleData: repository.isUsingSampleData(),
  };
}

module.exports = { getCustomerServiceMetrics };
