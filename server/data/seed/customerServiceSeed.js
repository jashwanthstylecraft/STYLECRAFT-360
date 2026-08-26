// Structural skeleton only — real numbers live in uploaded/entered snapshots
// (see repository.js). The slug list must stay in sync with
// shared/metricRegistry.mjs's customer-service department; several server
// code paths (uploadService.js's "which metrics exist" lookups,
// repository.js's structural fallback) walk this list, so an empty array
// here (rather than one entry per slug) would silently break XLSX upload
// metric resolution. Missing keys mean "no data" — same sparse rule as every
// other data source in this app.
const METRICS = [
  { slug: "defective-returns", values: {} },
  { slug: "repair-rate", values: {} },
  { slug: "customer-returns", values: {} },
];

module.exports = { METRICS };
