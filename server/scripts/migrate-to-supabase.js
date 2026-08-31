// One-off: copies every real local file (versioned snapshots, the active
// pointer, the counter, and every user account) into the new Supabase
// tables (see supabase-schema.sql) — so switching storage backends doesn't
// lose any of the real history already entered. Safe to re-run: every
// insert is an upsert keyed on the same id/key/username the source file
// already used.
const fs = require("fs");
const path = require("path");
const supabase = require("../data/supabaseClient");

const UPLOADS_DIR = path.join(__dirname, "..", "data", "uploads");
const ACTIVE_POINTER_FILE = path.join(UPLOADS_DIR, "active.json");
const COUNTER_FILE = path.join(__dirname, "..", "data", "state", "counter.json");
const USERS_FILE = path.join(__dirname, "..", "data", "state", "users.json");

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

async function migrateSnapshots() {
  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => /^\d+\.json$/.test(f));
  console.log(`Found ${files.length} snapshot file(s).`);

  const rows = files.map((file) => {
    const { departments, meta } = readJson(path.join(UPLOADS_DIR, file));
    return {
      id: meta.timestamp,
      applied_at: meta.appliedAt,
      note: meta.note ?? "",
      filename: meta.filename,
      source: meta.source ?? "Upload",
      departments,
    };
  });

  if (rows.length === 0) return;
  const { error } = await supabase.from("snapshots").upsert(rows);
  if (error) throw new Error(`snapshots upsert failed: ${error.message}`);
  console.log(`Migrated ${rows.length} snapshot(s).`);
}

async function migrateActivePointer() {
  const active = readJson(ACTIVE_POINTER_FILE);
  if (!active) {
    console.log("No active.json found — skipping active pointer.");
    return;
  }
  const { error } = await supabase.from("app_state").upsert({ key: "active_snapshot", value: active });
  if (error) throw new Error(`active pointer upsert failed: ${error.message}`);
  console.log(`Migrated active pointer -> ${active.filename}.`);
}

async function migrateCounter() {
  const counter = readJson(COUNTER_FILE);
  if (!counter) {
    console.log("No counter.json found — skipping counter.");
    return;
  }
  const { error } = await supabase.from("app_state").upsert({ key: "counter", value: counter });
  if (error) throw new Error(`counter upsert failed: ${error.message}`);
  console.log(`Migrated counter (total=${counter.total}).`);
}

async function migrateUsers() {
  const state = readJson(USERS_FILE);
  if (!state?.users?.length) {
    console.log("No users.json found — skipping users.");
    return;
  }
  const rows = state.users.map((u) => ({
    username: u.username,
    name: u.name,
    role: u.role,
    password_hash: u.passwordHash,
  }));
  const { error } = await supabase.from("users").upsert(rows);
  if (error) throw new Error(`users upsert failed: ${error.message}`);
  console.log(`Migrated ${rows.length} user(s): ${rows.map((r) => r.username).join(", ")}.`);
}

async function main() {
  await migrateSnapshots();
  await migrateActivePointer();
  await migrateCounter();
  await migrateUsers();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
