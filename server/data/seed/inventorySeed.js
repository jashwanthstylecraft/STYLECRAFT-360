// PURGED — Phase 6 (real data ingestion). This file used to carry fabricated
// demo numbers; those numbers now live only in
// _archive/inventorySeed.DO_NOT_LOAD.js for historical reference and are
// never `require`d by any code path. The slug list below must stay in sync
// with shared/metricRegistry.mjs's inventory department — several server
// code paths (uploadService.js's "which metrics exist" lookups,
// repository.js's structural fallback) walk this list, so an empty array
// here (rather than one entry per slug) would silently break XLSX upload
// metric resolution. Missing keys mean "no data" — same sparse rule as every
// other data source in this app.
const METRICS = [
  { slug: "inventory-level", values: {} },
  { slug: "open-factory-pos", values: {} },
  { slug: "in-stock-percentage", values: {} },
  { slug: "inventory-discrepancy", values: {} },
];

module.exports = { METRICS };
