// The master week calendar — every week-ending Friday from CALENDAR_START to
// CALENDAR_END. This is now the ONE source of "what weeks exist"; extending
// the calendar later means changing these two constants, not hardcoding a
// new list. True ESM — see weeks.mjs's header comment for why (Vite serves
// local files as native ESM with no CJS interop).
export const CALENDAR_START = "2022-10-14";
export const CALENDAR_END = "2027-03-12";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toUTCDate(iso) {
  return new Date(`${iso}T00:00:00Z`);
}

function twoDigitYear(year) {
  return String(year).slice(2);
}

// "Jul-31-26" — with a multi-year range a bare "Jul-31" is ambiguous across
// years, so the year suffix is part of the canonical label. Callers viewing
// a single-year window may drop it for cleanliness; that's a display
// decision, not this function's job.
export function formatWeekLabel(date) {
  return `${MONTH_ABBR[date.getUTCMonth()]}-${date.getUTCDate()}-${twoDigitYear(date.getUTCFullYear())}`;
}

// [{ weekEnding, label, month, quarter, year, index }, ...] — weekEnding
// (ISO date) is the only key anything should store or look up by; the rest
// are derived display/grouping fields.
export function generateWeeks(startISO = CALENDAR_START, endISO = CALENDAR_END) {
  const start = toUTCDate(startISO);
  const end = toUTCDate(endISO);
  const weeks = [];
  const cursor = new Date(start);
  let index = 0;

  while (cursor.getTime() <= end.getTime()) {
    const year = cursor.getUTCFullYear();
    const month0 = cursor.getUTCMonth();
    const quarter = Math.floor(month0 / 3) + 1;

    weeks.push({
      weekEnding: cursor.toISOString().slice(0, 10),
      label: formatWeekLabel(cursor),
      month: `${year}-${String(month0 + 1).padStart(2, "0")}`,
      quarter: `${year}-Q${quarter}`,
      year,
      index,
    });

    cursor.setUTCDate(cursor.getUTCDate() + 7);
    index++;
  }

  return weeks;
}

// The week whose Friday is the next Friday on/after `today` (a Date or ISO
// string) — "current" for Data Entry's default target and for deciding
// which weeks in the sheet are future/plan-ahead.
export function currentWeek(today) {
  const reference = today instanceof Date ? today : new Date(`${today}T00:00:00Z`);
  const cursor = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  while (cursor.getUTCDay() !== 5) cursor.setUTCDate(cursor.getUTCDate() + 1);
  return cursor.toISOString().slice(0, 10);
}

export default { CALENDAR_START, CALENDAR_END, generateWeeks, formatWeekLabel, currentWeek };
