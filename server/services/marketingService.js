const repository = require("../data/repository");
const { buildMetric, withLatestWeekSummary, withYtd } = require("./metricsHelpers");
const { applyPeriodToDepartment } = require("./aggregate");

// Marketing has no metrics of its own right now (both moved to Operations —
// see shared/metricRegistry.mjs) — no summary to compute. Kept as a function
// (rather than removed outright) so the department can grow a real summary
// again once it has metrics.
function buildSummary() {
  return {};
}

function getMarketingMetrics(period, range, opts = {}) {
  const raw = repository.getDepartmentData("marketing", range);
  const { WEEKS, WEEK_ENDINGS, AS_OF, METRICS, period: resolvedPeriod } = applyPeriodToDepartment(raw, period);
  let metrics = withLatestWeekSummary("marketing", METRICS.map(buildMetric), buildMetric);
  if (!opts.skipYtd) {
    metrics = withYtd(metrics, (ytdRange) => getMarketingMetrics("weekly", ytdRange, { skipYtd: true }));
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

module.exports = { getMarketingMetrics };
