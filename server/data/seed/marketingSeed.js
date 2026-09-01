// Marketing has no metrics of its own right now — both of its former
// metrics (new-social-follow-subs, product-reviews) moved to Operations.
// Kept as a real, empty department (not deleted) for future use — see
// shared/metricRegistry.mjs, which has no "marketing" entries either.
const METRICS = [];

module.exports = { METRICS };
