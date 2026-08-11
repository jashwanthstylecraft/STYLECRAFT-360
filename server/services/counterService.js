const fs = require("fs");
const path = require("path");
const { SEED_TOTAL } = require("../data/state/counter.seed");
const { createChannel } = require("./sseHub");

const STATE_DIR = path.join(__dirname, "..", "data", "state");
const STATE_FILE = path.join(STATE_DIR, "counter.json");
const MAX_UNITS_PER_CALL = 100000;

const channel = createChannel();

function readState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed.total)) return { isPlaceholder: true, ...parsed };
  } catch {
    // No file yet, or it's corrupt — fall through to the seed value.
  }
  return { total: SEED_TOTAL, asOf: new Date(0).toISOString(), isPlaceholder: true };
}

function writeState(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

let state = readState();
if (!fs.existsSync(STATE_FILE)) writeState(state);

function getState() {
  return state;
}

function persistAndBroadcast() {
  writeState(state);
  channel.broadcast("update", state);
}

// A real increment (e.g. a future order-feed webhook) moves the number but
// doesn't by itself make it a verified total — isPlaceholder only clears via
// setTotal, the explicit "a human confirmed this number" action.
function increment(units) {
  if (!Number.isInteger(units) || units <= 0) {
    throw new RangeError("units must be a positive integer");
  }
  if (units > MAX_UNITS_PER_CALL) {
    throw new RangeError(`units must be <= ${MAX_UNITS_PER_CALL} per call`);
  }
  state = { total: state.total + units, asOf: new Date().toISOString(), isPlaceholder: state.isPlaceholder };
  persistAndBroadcast();
  return state;
}

function setTotal(total) {
  if (!Number.isInteger(total) || total < 0) {
    throw new RangeError("total must be a non-negative integer");
  }
  state = { total, asOf: new Date().toISOString(), isPlaceholder: false };
  persistAndBroadcast();
  return state;
}

function subscribe(req, res) {
  channel.addClient(req, res);
}

module.exports = { getState, increment, setTotal, subscribe };
