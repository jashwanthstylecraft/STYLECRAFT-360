// Reads the live "AllTimeInvoicedQtybySKU" Google Sheet — a full all-time
// snapshot (one row per SKU, a GRAND TOTAL row at the bottom), regenerated
// in full every Friday. Unlike googleSheetsFetcher.js's weekly delta sheet,
// there's no per-week math here: the sheet's own grand total IS the current
// lifetime units figure, so the weekly sync just replaces the Home
// dashboard counter's total outright (see counterService.setTotal) rather
// than accumulating anything.
//
// Auth: same read-only service account as googleSheetsFetcher.js
// (GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY), shared as a Viewer on this sheet too.
const { GoogleAuth } = require("google-auth-library");

const SPREADSHEET_ID = "18D6ay96suzQRNpid2gU7dMXafkWmQW68drnuHxprQ0I";
const SHEET_TAB = "AllTimeInvoicedQtybySKU.xlsx";
const RANGE = `'${SHEET_TAB}'!A1:D2000`;

let cachedAuth = null;
function getAuth() {
  if (cachedAuth) return cachedAuth;
  const raw = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY is not set — see server/.env.example.");
  const credentials = JSON.parse(raw);
  cachedAuth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
  return cachedAuth;
}

async function fetchRawValues() {
  const auth = getAuth();
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(RANGE)}?valueRenderOption=UNFORMATTED_VALUE`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Sheets API error (${res.status}): ${json?.error?.message ?? JSON.stringify(json)}`);
  }
  return json.values ?? [];
}

// Row shape: [SKU, Item Description, Qty Invoiced, Sort Order]. The sheet's
// own last row is always "GRAND TOTAL" / "All SKUs Combined" — pulled out
// as the authoritative total rather than summed ourselves, so this never
// silently drifts from whatever total the business itself considers correct
// (e.g. if a future version of the sheet excludes a SKU from the sum for a
// reason not visible in the per-SKU rows).
function parseRows(values) {
  const [, ...rows] = values; // drop the header row
  const skus = [];
  let grandTotal = null;

  for (const row of rows) {
    const [sku, description, qty] = row;
    if (!sku) continue;
    if (sku === "GRAND TOTAL") {
      grandTotal = Number(qty);
      break;
    }
    skus.push({ sku: String(sku), description: description ? String(description) : "", qty: Number(qty) || 0 });
  }

  if (grandTotal === null || !Number.isFinite(grandTotal)) {
    throw new Error('Could not find a numeric "GRAND TOTAL" row in the units-by-SKU sheet — its layout may have changed.');
  }

  return { skus, grandTotal };
}

async function fetchUnitsBySku() {
  const values = await fetchRawValues();
  return parseRows(values);
}

module.exports = { fetchUnitsBySku };
