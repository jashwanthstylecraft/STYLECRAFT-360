const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const STATE_DIR = path.join(__dirname, "..", "data", "state");
const STATE_FILE = path.join(STATE_DIR, "users.json");
const SALT_ROUNDS = 10;

// The two admins are seeded once, here, on first boot — they are not
// creatable through the Team panel (that only ever adds "viewer" accounts).
// Passwords are hashed immediately; the plaintext values live nowhere after
// this file executes.
const SEED_ADMINS = [
  { username: "jashwanthd@stylecraftus.com", name: "Jashwanth", password: "123456789" },
  { username: "mark@stylecraftus.com", name: "Mark", password: "123456789" },
];

function readState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.users)) return parsed;
  } catch {
    // No file yet, or it's corrupt — fall through to a fresh seed.
  }
  return { users: SEED_ADMINS.map((a) => seedAdmin(a)) };
}

function seedAdmin({ username, name, password }) {
  return { username, name, role: "admin", passwordHash: bcrypt.hashSync(password, SALT_ROUNDS) };
}

function writeState(next) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
}

let state = readState();
if (!fs.existsSync(STATE_FILE)) writeState(state);

function findUser(username) {
  return state.users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
}

function verifyCredentials(username, password) {
  const user = findUser(username);
  if (!user) return null;
  if (!bcrypt.compareSync(String(password ?? ""), user.passwordHash)) return null;
  return { username: user.username, name: user.name, role: user.role };
}

// Never returns password hashes — this is the shape the Team panel's list
// view and any other read path get.
function listUsers() {
  return state.users.map(({ username, name, role }) => ({ username, name, role }));
}

function addViewer({ username, name, password }) {
  if (!username || !password) throw new RangeError("username and password are required");
  if (findUser(username)) throw new RangeError("A user with that username already exists");
  state.users.push({
    username,
    name: name || username,
    role: "viewer",
    passwordHash: bcrypt.hashSync(String(password), SALT_ROUNDS),
  });
  writeState(state);
  return listUsers();
}

function removeUser(username) {
  const user = findUser(username);
  if (!user) throw new RangeError("No such user");
  if (user.role === "admin") throw new RangeError("Admin accounts can't be removed here");
  state.users = state.users.filter((u) => u.username.toLowerCase() !== String(username).toLowerCase());
  writeState(state);
  return listUsers();
}

function resetPassword(username, newPassword) {
  const user = findUser(username);
  if (!user) throw new RangeError("No such user");
  if (!newPassword) throw new RangeError("newPassword is required");
  user.passwordHash = bcrypt.hashSync(String(newPassword), SALT_ROUNDS);
  writeState(state);
}

module.exports = { verifyCredentials, listUsers, addViewer, removeUser, resetPassword };
