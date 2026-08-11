// Fallback display label for a raw series key when no registry headerValue
// names it — mirrors server/services/detailStats.js's humanizeKey exactly.
// "gammaPlus" -> "Gamma Plus".
export function humanizeKey(key) {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
