// A personal, client-only viewing preference: "don't show me weeks before
// this date." It never touches stored data — every real value stays
// exactly where it is (server/data/uploads/*.json, untouched) — it only
// clamps the `from` a chart/detail-page/home-insight query resolves to, so
// re-enabling instantly brings the older weeks back into view with nothing
// to "restore." Data Entry and the Data (versions/upload) page intentionally
// ignore this — they're for managing the underlying data, not viewing
// reports, so they always show/edit the full calendar regardless.
const STORAGE_KEY = "stylecraft-visibility-floor"; // {enabled: bool, from: "YYYY-MM-DD"|null}
const EVENT_NAME = "stylecraft-visibility-floor-changed";

const DEFAULT_FLOOR = { enabled: false, from: null };

export function getVisibilityFloor() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FLOOR;
    const parsed = JSON.parse(raw);
    return { enabled: Boolean(parsed.enabled), from: parsed.from ?? null };
  } catch {
    return DEFAULT_FLOOR;
  }
}

export function setVisibilityFloor(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT_NAME));
}

// Clamps `from` forward to the floor date when the floor is on and `from`
// would otherwise reach earlier than it — `to` (and the case where `from`
// is already null, e.g. the server's own "no range requested" default) are
// never touched, since this only ever hides PAST data, never future/latest.
export function applyVisibilityFloor(from, floor) {
  if (!floor.enabled || !floor.from || !from) return from;
  return from < floor.from ? floor.from : from;
}

export { EVENT_NAME as VISIBILITY_FLOOR_CHANGED_EVENT };
