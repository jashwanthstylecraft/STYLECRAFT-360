// Reads the live "Data for Chart" tab of the team's Google Sheet directly
// via the Sheets API — the server-side replacement for the old approach
// (a scheduled cloud agent reading the sheet through a Drive connector,
// then trying to log into the app over HTTPS). That agent's sandbox had
// its outbound network to stylecraft-360.vercel.app blocked by its own
// egress policy (connect_rejected), every single run, so nothing ever
// actually synced automatically. This runs as part of the app's own
// Vercel Cron job instead (routes/cron.js) — no separate network hop to
// this app needed, no session cookie, no sandbox to be blocked.
//
// Auth: a Google Cloud service account (GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY
// env var, the full JSON key as one value — see .env.example), granted
// read-only access by sharing the sheet with that account's email as a
// Viewer. Read-only scope only; this can never write to the sheet.
const { GoogleAuth } = require("google-auth-library");

const SPREADSHEET_ID = "1D0OBCd-03RFrfatUSF_3sXlrFzJZjk-GvKt6YVzYaYQ";
const SHEET_TAB = "Data for Chart";
// Wide enough for every mapped column in sync-google-sheet.js (highest is
// Beauty Sales' goalCol 60) plus headroom — matches the tab's own 63-column
// width (verified via the Sheets API's spreadsheets.get).
const RANGE = `'${SHEET_TAB}'!A1:BK960`;

let cachedAuth = null;
function getAuth() {
  if (cachedAuth) return cachedAuth;
  const raw = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY is not set — see server/.env.example.");
  const credentials = JSON.parse(raw);
  cachedAuth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
  return cachedAuth;
}

// FORMATTED_VALUE (not UNFORMATTED_VALUE) is deliberate — a date-typed cell
// (the week column) comes back as its raw Google Sheets serial number under
// UNFORMATTED_VALUE, not the "Sep-11"-style text sync-google-sheet.js's
// resolveWeekEnding() expects; FORMATTED_VALUE renders exactly what a human
// (or the old markdown-table export) would see, e.g. "$366,000.0" for a
// currency cell, "Sep-11" for the week cell — the same shape buildEntries'
// parseNumber() and resolveWeekEnding() were built and tested against.
async function fetchRawValues() {
  const auth = getAuth();
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(RANGE)}?valueRenderOption=FORMATTED_VALUE`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Sheets API error (${res.status}): ${json?.error?.message ?? JSON.stringify(json)}`);
  }
  return json.values ?? [];
}

// Same row shape sync-google-sheet.js's parseSheetExport produces from the
// old markdown-table text ({week, cells}[]), so planSyncFromRows and
// everything downstream of it needs no changes for this new source.
function findDataRows(values) {
  const weeksHeaderIndex = values.findIndex((r) => r.some((c) => String(c).includes("# Weeks")));
  if (weeksHeaderIndex === -1) {
    throw new Error('Could not find the "# Weeks" marker row in the Data for Chart tab — its layout may have changed.');
  }
  const dataRows = values.slice(weeksHeaderIndex + 4).filter((r) => r[1]); // r[1] = week label; blank = end of table
  return dataRows.map((cells) => ({ week: cells[1], cells }));
}

async function fetchDataForChartRows() {
  const values = await fetchRawValues();
  return findDataRows(values);
}

module.exports = { fetchDataForChartRows };
