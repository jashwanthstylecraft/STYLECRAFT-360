// Thin client wrapper around the shared master calendar — Vite serves
// shared/*.mjs as native ESM, so this is the same source of truth the
// server uses (see server/data/sharedRegistry.js for the CJS-side bridge).
import { CALENDAR_START, CALENDAR_END, generateWeeks, formatWeekLabel, currentWeek } from "../../../shared/weekCalendar.mjs";

export { CALENDAR_START, CALENDAR_END, generateWeeks, currentWeek };

export function formatWeekEndingLabel(weekEnding) {
  return formatWeekLabel(new Date(`${weekEnding}T00:00:00Z`));
}
