// Rounded-top rect path for bars that need a custom Recharts `shape` (i.e.
// anything beyond what the built-in `radius` prop can express, like the
// dashed-outline Unpaid segment in PaidUnpaidStackedChart).
export function roundedTopRectPath(x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  return `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
}
