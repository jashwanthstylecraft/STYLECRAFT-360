import { generateWeeks, CALENDAR_START, CALENDAR_END } from "./weekCalendar";

export const PRESETS = [
  { value: "last12weeks", label: "Last 12 weeks" },
  { value: "last26weeks", label: "Last 26 weeks" },
  { value: "ytd", label: "Year to date" },
  { value: "last12months", label: "Last 12 months" },
  { value: "alltime", label: "All time" },
  { value: "custom", label: "Custom range" },
];

// Every preset (except All time, which is calendar-fixed) is anchored to
// the latest week with any real data — the same anchor the server's own
// "no range requested" default uses, so "Last 12 weeks" here matches
// exactly what a page shows before the user ever touches this control.
export function rangeForPreset(preset, anchorWeekEnding, custom) {
  if (preset === "alltime") return { from: CALENDAR_START, to: CALENDAR_END };
  if (preset === "custom") return custom ?? null;
  if (!anchorWeekEnding) return null;

  const upToAnchor = generateWeeks(CALENDAR_START, anchorWeekEnding);

  if (preset === "last12weeks") return null; // matches the server default — no params needed
  if (preset === "last26weeks") {
    const slice = upToAnchor.slice(-26);
    return { from: slice[0].weekEnding, to: anchorWeekEnding };
  }
  if (preset === "last12months") {
    const slice = upToAnchor.slice(-52);
    return { from: slice[0].weekEnding, to: anchorWeekEnding };
  }
  if (preset === "ytd") {
    const year = upToAnchor[upToAnchor.length - 1].year;
    const firstOfYear = upToAnchor.find((w) => w.year === year);
    return { from: firstOfYear.weekEnding, to: anchorWeekEnding };
  }
  return null;
}

// Custom-range date inputs aren't guaranteed to land on an actual Friday
// week-ending — every stored value is keyed by a real Friday, so snap
// whatever the user picks to the closest one before it ever reaches the API.
export function snapToNearestWeekEnding(dateStr) {
  const all = generateWeeks();
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  let closest = all[0];
  let closestDiff = Infinity;
  for (const w of all) {
    const diff = Math.abs(new Date(`${w.weekEnding}T00:00:00Z`).getTime() - target);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = w;
    }
  }
  return closest.weekEnding;
}
