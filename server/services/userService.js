const bcrypt = require("bcryptjs");
const supabase = require("../data/supabaseClient");

const SALT_ROUNDS = 10;

// Real data is normally already in the `users` table (migrate-to-supabase.js
// copies it from the old users.json once) — this is just a safety net so a
// genuinely empty table (a fresh Supabase project with no migration ever
// run) still seeds the same two admins the app has always started with,
// instead of becoming permanently un-loginable. Checked once per process
// lifetime, not on every call.
const SEED_ADMINS = [
  { username: "jashwanthd@stylecraftus.com", name: "Jashwanth", password: "123456789" },
  { username: "mark@stylecraftus.com", name: "Mark", password: "123456789" },
];

let seedChecked = false;

async function ensureSeeded() {
  if (seedChecked) return;
  seedChecked = true;
  const { count, error } = await supabase.from("users").select("*", { count: "exact", head: true });
  if (error) throw new Error(`Failed to check users table: ${error.message}`);
  if (count > 0) return;

  const rows = SEED_ADMINS.map((a) => ({
    username: a.username,
    name: a.name,
    role: "admin",
    password_hash: bcrypt.hashSync(a.password, SALT_ROUNDS),
  }));
  const { error: insertError } = await supabase.from("users").insert(rows);
  if (insertError) throw new Error(`Failed to seed admins: ${insertError.message}`);
}

async function findUser(username) {
  await ensureSeeded();
  const { data, error } = await supabase.from("users").select("*").ilike("username", username).maybeSingle();
  if (error) throw new Error(`Failed to look up user: ${error.message}`);
  return data;
}

async function verifyCredentials(username, password) {
  const user = await findUser(username);
  if (!user) return null;
  if (!bcrypt.compareSync(String(password ?? ""), user.password_hash)) return null;
  return { username: user.username, name: user.name, role: user.role };
}

// Never returns password hashes — this is the shape the Team panel's list
// view and any other read path get.
async function listUsers() {
  await ensureSeeded();
  const { data, error } = await supabase.from("users").select("username, name, role").order("username");
  if (error) throw new Error(`Failed to list users: ${error.message}`);
  return data;
}

async function addViewer({ username, name, password }) {
  if (!username || !password) throw new RangeError("username and password are required");
  if (await findUser(username)) throw new RangeError("A user with that username already exists");
  const { error } = await supabase.from("users").insert({
    username,
    name: name || username,
    role: "viewer",
    password_hash: bcrypt.hashSync(String(password), SALT_ROUNDS),
  });
  if (error) throw new Error(`Failed to add user: ${error.message}`);
  return listUsers();
}

async function removeUser(username) {
  const user = await findUser(username);
  if (!user) throw new RangeError("No such user");
  if (user.role === "admin") throw new RangeError("Admin accounts can't be removed here");
  const { error } = await supabase.from("users").delete().eq("username", user.username);
  if (error) throw new Error(`Failed to remove user: ${error.message}`);
  return listUsers();
}

async function resetPassword(username, newPassword) {
  const user = await findUser(username);
  if (!user) throw new RangeError("No such user");
  if (!newPassword) throw new RangeError("newPassword is required");
  const { error } = await supabase
    .from("users")
    .update({ password_hash: bcrypt.hashSync(String(newPassword), SALT_ROUNDS) })
    .eq("username", user.username);
  if (error) throw new Error(`Failed to reset password: ${error.message}`);
}

module.exports = { verifyCredentials, listUsers, addViewer, removeUser, resetPassword };
