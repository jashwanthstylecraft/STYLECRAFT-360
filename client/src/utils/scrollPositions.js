// Module-level (survives route changes, not page reloads) — lets a page
// remember its own scroll offset across a round-trip to the metric detail
// page and back, without a router-level scroll-restoration library. Keyed
// by whatever string the page passes (its department key is enough, since
// only one instance of each page is ever mounted at a time).
const positions = new Map();

export function saveScrollPosition(key, value) {
  if (key) positions.set(key, value);
}

export function getScrollPosition(key) {
  return key ? positions.get(key) : undefined;
}
