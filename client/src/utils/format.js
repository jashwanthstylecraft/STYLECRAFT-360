export function formatCurrencyCompact(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${trimDecimal(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}$${trimDecimal(abs / 1_000)}K`;
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
// exactly as before.
export function formatValue(value, format = "currency") {
  switch (format) {
    case "percent":
      return formatPercentFraction(value);
    case "decimal":
      return formatDecimal(value);
    case "count":
      return formatCount(value);
    case "currency":
    default:
      return formatCurrencyCompact(value);
  }
}

function trimDecimal(value) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}
