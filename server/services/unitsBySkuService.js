// Stores the latest units-by-SKU snapshot (see unitsBySkuFetcher.js) —
// same app_state key/value pattern as counterService.js's "counter" row,
// refreshed by the same Saturday weekly-sheet-sync cron job. Read-facing
// only; the one write path is syncUnitsBySku(), called from routes/cron.js.
const supabase = require("../data/supabaseClient");

const STATE_KEY = "units-by-sku";

async function getUnitsBySku() {
  const { data, error } = await supabase.from("app_state").select("value").eq("key", STATE_KEY).maybeSingle();
  if (error) throw new Error(`Failed to read units-by-SKU: ${error.message}`);
  return data?.value ?? { asOf: null, grandTotal: null, skus: [] };
}

async function setUnitsBySku({ grandTotal, skus }) {
  const value = { asOf: new Date().toISOString(), grandTotal, skus };
  const { error } = await supabase.from("app_state").upsert({ key: STATE_KEY, value });
  if (error) throw new Error(`Failed to save units-by-SKU: ${error.message}`);
  return value;
}

module.exports = { getUnitsBySku, setUnitsBySku };
