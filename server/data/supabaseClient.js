// One configured Supabase client, shared by every module that reads/writes
// snapshots, app_state, or users (see server/scripts/supabase-schema.sql).
// Service-role key — this runs only in trusted server code, same trust
// level as SESSION_SECRET; never sent to the client.
//
// Loads .env itself (not just app.js's boot path) so standalone scripts
// (migrate-to-supabase.js, reset-password.js, ...) get real credentials too
// without each duplicating this.
try {
  process.loadEnvFile();
} catch {
  // No .env file present, or already loaded by the caller — fine either way.
}

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see server/.env.example) — the app now stores its data in Supabase, not local files."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

module.exports = supabase;
