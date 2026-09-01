export function formatCurrencyCompact(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${trimDecimal(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}$${trimDecimal(abs / 1_000)}K`;
  return `${sign}$${abs.toLocaleString("en-US")}`;
}

// Same as formatCurrencyCompact, but the thousands ("K") tier rounds to a
// whole number instead of keeping 2 decimals — for the Result/Goal header
// display only, where "$238.85K" reads as noise next to a whole "$553K".
// Millions stay at full precision; this only ever changes the STRING shown,
// never the underlying value.
export function formatCurrencyCompactRounded(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${trimDecimal(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${abs.toLocaleString("en-US")}`;
}

export function formatCurrencyFull(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value, { signed = false } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

// For fractions (0.49) rather than already-scaled percentages (49) — the
// shape returned by every percent-format metric in the Phase 2 seed data.
export function formatPercentFraction(value, { decimals = 0 } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDecimal(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(decimals);
}

export function formatCount(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Math.round(value).toLocaleString("en-US");
}

// Dispatches to the right formatter for a metric's declared `format` field.
// Defaults to currency so Phase 1 metrics (which never set `format`) render
// exactly as before. `roundThousands` swaps in formatCurrencyCompactRounded
// for the currency case — opt in only where a whole-K display is wanted.
export function formatValue(value, format = "currency", { roundThousands = false } = {}) {
  switch (format) {
    case "percent":
      return formatPercentFraction(value);
    case "decimal":
      return formatDecimal(value);
    case "count":
      return formatCount(value);
    case "currency":
    default:
      return roundThousands ? formatCurrencyCompactRounded(value) : formatCurrencyCompact(value);
  }
}

function trimDecimal(value) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}
