// Shared between templateService (writes) and uploadService (reads): the
// optional Counter sheet is the one part of the contract still format-
// agnostic. The OLD (Phase 1-6) main data layout is StyleCraft's real "Raw
// Data - Do Not Touch" export — see xlsxHeadingMap.js for that mapping.
// Still read on import (deprecation warning), no longer written.
const COUNTER_SHEET = "Counter";
const COUNTER_KEY = "units_sold_total";

// ---- Phase 8: the canonical Data-sheet schema, shared by export
// (exportService.js, via the Python chart-writer) and import
// (uploadService.js's parseCanonicalDataSheet). One definition, two
// consumers — the whole point being that export and import can never
// silently drift apart, which is what "round-trip = zero diffs" depends on.
const GRAPHS_SHEET = "Graphs";
const DATA_SHEET = "Data";
const META_MARKER = "#meta"; // first cell of the metadata block below the data rows

const FIXED_COLUMNS = [
  "metric_slug",
  "metric_name",
  "department",
  "series",
  "row_type",
  "goal_label",
  "goal_direction",
  "aggregation",
];
const FIRST_WEEK_COLUMN_INDEX = FIXED_COLUMNS.length; // 0-based; weeks start here

const ROW_TYPE = { VALUE: "value", GOAL: "goal" };

// Department row order is fixed (not alphabetical, not registry-declaration
// order) so two exports of the same data are byte-identical apart from the
// metadata timestamp — see the "deterministic" strictness rule.
const DEPARTMENT_ORDER = ["sales", "inventory", "finance", "operations"];

// Display-only number formats (Excel format codes) — the underlying stored
// value is never rounded or rescaled to match; a 0.5487 percent value keeps
// every digit even though the cell displays "54.9%".
const NUMBER_FORMAT = {
  currency: "#,##0",
  percent: "0.0%",
  decimal: "0.00",
  count: "0",
};

module.exports = {
  COUNTER_SHEET,
  COUNTER_KEY,
  GRAPHS_SHEET,
  DATA_SHEET,
  META_MARKER,
  FIXED_COLUMNS,
  FIRST_WEEK_COLUMN_INDEX,
  ROW_TYPE,
  DEPARTMENT_ORDER,
  NUMBER_FORMAT,
};
