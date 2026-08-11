// The canonical week labels + their real calendar dates for the seed data.
// Week-ending dates matter now that Phase 4 aggregates by calendar month/
// quarter/year — a label like "Jul-31" is ambiguous across years, the ISO
// date isn't. Real uploads/entries carry their own weekEndings (computed
// from actual dates); this module only backfills the seed's original 10.
//
// True ESM (not CJS): the client (Vite/browser ESM) and server (Node) both
// need to import the exact same source with no build step. Vite serves
// local files as native ESM with no CommonJS interop, so `module.exports`
// doesn't work here — the server side bridges this via a dynamic import
// (see server/data/sharedRegistry.js).
export const WEEK_LABELS = ["May-29", "Jun-5", "Jun-12", "Jun-19", "Jun-26", "Jul-3", "Jul-10", "Jul-17", "Jul-24", "Jul-31"];
export const LAST_WEEK_ENDING = "2026-07-31";

export function computeWeekEndings(labels, lastEnding) {
  const last = new Date(`${lastEnding}T00:00:00Z`);
  return labels.map((_, i) => {
    const d = new Date(last);
    d.setUTCDate(d.getUTCDate() - (labels.length - 1 - i) * 7);
    return d.toISOString().slice(0, 10);
  });
}

export const WEEK_ENDINGS = computeWeekEndings(WEEK_LABELS, LAST_WEEK_ENDING);

export default { WEEK_LABELS, WEEK_ENDINGS, LAST_WEEK_ENDING, computeWeekEndings };
