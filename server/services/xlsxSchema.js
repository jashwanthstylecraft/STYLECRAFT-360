// Shared between templateService (writes) and uploadService (reads): the
// optional Counter sheet is the one part of the contract still format-
// agnostic. The main data layout is StyleCraft's real "Raw Data - Do Not
// Touch" export — see xlsxHeadingMap.js for that mapping.
const COUNTER_SHEET = "Counter";
const COUNTER_KEY = "units_sold_total";

module.exports = {
  COUNTER_SHEET,
  COUNTER_KEY,
};
