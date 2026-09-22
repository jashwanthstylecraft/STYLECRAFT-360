// Staff allowed through the email gate (client/src/pages/Login.jsx's
// "Sign in with Google" + routes/auth.js's /google/callback, which checks
// isAllowedEmail() after Google itself confirms the sign-in) — no password,
// Google's own OAuth confirms ownership of the address. Backed by Supabase
// (the `allowed_emails` table) instead of a hardcoded list, so an admin can
// add or remove someone from Settings without a code deploy. TTL-cached the
// same way hiddenMetrics.js/customMetrics.js are, refreshed by the same
// per-request middleware (see app.js).
const supabase = require("./supabaseClient");

// Seeded into the table once, the first time it's ever read empty (e.g. a
// fresh Supabase project, or this table right after being created) — so
// the 16 directors already using this list keep working without anyone
// having to re-enter them by hand.
const SEED_EMAILS = [
  "allan@stylecraftus.com",
  "austin@stylecraftus.com",
  "caryn@stylecraftus.com",
  "support@stylecraftus.com",
  "jason@stylecraftus.com",
  "ken.russo@stylecraftus.com",
  "elizabetho@stylecraftus.com",
  "mark@stylecraftus.com",
  "marlog@stylecraftus.com",
  "nadzeyam@stylecraftus.com",
  "peterg@stylecraftus.com",
  "steve@stylecraftus.com",
  "tres@stylecraftus.com",
  "victoriab@stylecraftus.com",
  "victoria@stylecraftus.com",
  "spencer@stylecraftus.com",
];

// See repository.js's CACHE_TTL_MS comment — a write bypasses this (see
// addAllowedEmail/removeAllowedEmail below), and the client's own poll
// interval is already well over this, so there's no benefit to checking
// Supabase for changes more often.
const CACHE_TTL_MS = 30000;

let cached = [];
let cachedAt = 0;
let hasFetchedOnce = false;

async function seedIfEmpty() {
  const rows = SEED_EMAILS.map((email) => ({ email }));
  const { error } = await supabase.from("allowed_emails").upsert(rows, { onConflict: "email" });
  if (error) throw new Error(`Failed to seed allowed emails: ${error.message}`);
}

async function ensureFreshAllowedEmails() {
  if (hasFetchedOnce && Date.now() - cachedAt < CACHE_TTL_MS) return;
  let { data, error } = await supabase.from("allowed_emails").select("email").order("email");
  if (error) throw new Error(`Failed to read allowed emails: ${error.message}`);
  if (!data || data.length === 0) {
    await seedIfEmpty();
    ({ data, error } = await supabase.from("allowed_emails").select("email").order("email"));
    if (error) throw new Error(`Failed to read allowed emails: ${error.message}`);
  }
  cached = (data ?? []).map((row) => row.email);
  cachedAt = Date.now();
  hasFetchedOnce = true;
}

function getAllowedEmails() {
  return cached;
}

function isAllowedEmail(email) {
  return cached.includes(String(email ?? "").trim().toLowerCase());
}

async function addAllowedEmail(email) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new RangeError("Enter a valid email address.");
  }
  const { error } = await supabase.from("allowed_emails").upsert({ email: normalized }, { onConflict: "email" });
  if (error) throw new Error(`Failed to add email: ${error.message}`);
  cachedAt = 0; // force the next read to refetch
}

async function removeAllowedEmail(email) {
  const normalized = String(email ?? "").trim().toLowerCase();
  const { error } = await supabase.from("allowed_emails").delete().eq("email", normalized);
  if (error) throw new Error(`Failed to remove email: ${error.message}`);
  cachedAt = 0;
}

module.exports = {
  ensureFreshAllowedEmails,
  getAllowedEmails,
  isAllowedEmail,
  addAllowedEmail,
  removeAllowedEmail,
};
