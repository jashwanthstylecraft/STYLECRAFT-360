// One cell-validation function, shared by the Data Entry save path and (in
// spirit) the same rules the XLSX parser enforces — a blank cell is always
// valid (it means "no data for this week", not zero), and every other rule
// is driven by the metric's registry `format` and chart type, never
// hardcoded per metric.
//
// Returns { value: number|null, error: string|null }. `value === null` with
// `error === null` means "intentionally blank" — render a gap, not a zero.
function validateCellValue(rawValue, metric) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return { value: null, error: null };
  }

  const format = metric.format || "currency";
  const allowNegative = metric.chartType === "divergingBar";

  if (format === "percent") {
    const cleaned = String(rawValue).trim().replace(/%$/, "");
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return { value: null, error: "Enter a number, e.g. 49 or 49%." };
    if (num < 0 || num > 150) return { value: null, error: "Percent values should be roughly 0–150." };
    return { value: num / 100, error: null };
  }

  const cleaned = String(rawValue).trim().replace(/,/g, "").replace(/^\$/, "");
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return { value: null, error: "Enter a valid number." };
  if (format === "count" && !Number.isInteger(num)) return { value: null, error: "Enter a whole number." };
  if (num < 0 && !allowNegative) return { value: null, error: "Negative values aren't allowed for this metric." };

  return { value: num, error: null };
}

module.exports = { validateCellValue };
