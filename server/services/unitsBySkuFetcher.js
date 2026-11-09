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

// Re-pointed 2026-11-08: the sheet is periodically re-exported as an Office
// file by the warehouse system (the Sheets API can't read those directly —
// see googleSheetsFetcher.js's equivalent note), which breaks this ID each
// time; this is the latest "Save as Google Sheets" copy, shared read-only
// with the same service account.
const SPREADSHEET_ID = "1dF-wYKHj5MAdHuTKRq_y_TR9ME8IxKoskFNgo9F-yTU";
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

// These aren't product units sold — they're non-inventory line items the
// warehouse system invoices through the same sheet (shipping/freight
// charges, sending out a repaired item, miscellaneous charges, sales tax)
// — so they're excluded from both the per-SKU list and the grand total.
const EXCLUDED_SKUS = new Set(["ShippingServiceItem", "SendRepairedItem", "FREIGHT", "SendMiscellaneousItem", "TAX"]);

// Row shape: [SKU, Item Description, Qty Invoiced, Sort Order]. The sheet's
// own last row is always "GRAND TOTAL" / "All SKUs Combined" — used as the
// starting point rather than summed ourselves, so this never silently
// drifts from whatever total the business itself considers correct (e.g. if
// a future version of the sheet excludes a SKU from the sum for a reason
// not visible in the per-SKU rows) — EXCLUDED_SKUS above is then subtracted
// back out on top of that.
function parseRows(values) {
  const [, ...rows] = values; // drop the header row
  const skus = [];
  let grandTotal = null;
  let excludedQty = 0;

  for (const row of rows) {
    const [sku, description, qty] = row;
    if (!sku) continue;
    if (sku === "GRAND TOTAL") {
      grandTotal = Number(qty);
      break;
    }
    const skuStr = String(sku);
    if (EXCLUDED_SKUS.has(skuStr)) {
      excludedQty += Number(qty) || 0;
      continue;
    }
    skus.push({ sku: skuStr, description: description ? String(description) : "", qty: Number(qty) || 0 });
  }

  if (grandTotal === null || !Number.isFinite(grandTotal)) {
    throw new Error('Could not find a numeric "GRAND TOTAL" row in the units-by-SKU sheet — its layout may have changed.');
  }

  return { skus, grandTotal: grandTotal - excludedQty };
}

async function fetchUnitsBySku() {
  const values = await fetchRawValues();
  return parseRows(values);
}

module.exports = { fetchUnitsBySku };
