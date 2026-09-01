// Customer Service has no metrics of its own right now — all three of its
// former metrics (defective-returns, repair-rate, customer-returns) moved to
// Operations. Kept as a real, empty department (not deleted) for future use
// — see shared/metricRegistry.mjs, which has no "customer-service" entries
// either.
const METRICS = [];

module.exports = { METRICS };
