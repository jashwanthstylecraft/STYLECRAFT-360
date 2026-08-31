const supabase = require("../data/supabaseClient");
const { SEED_TOTAL } = require("../data/state/counter.seed");
const { createChannel } = require("./sseHub");

const STATE_KEY = "counter";
const MAX_UNITS_PER_CALL = 100000;

// SSE stays wired for local/self-hosted running (a real persistent process
// can hold these connections) — client/src/hooks/useCounter.js already
// falls back to polling on its own if a stream never connects (e.g. on a
// serverless deployment), so no server-side environment branching is
// needed here at all.
const channel = createChannel();

async function readState() {
  const { data, error } = await supabase.from("app_state").select("value").eq("key", STATE_KEY).maybeSingle();
  if (error) throw new Error(`Failed to read counter: ${error.message}`);
  if (data?.value && Number.isFinite(data.value.total)) return data.value;
  return { total: SEED_TOTAL, asOf: new Date(0).toISOString(), isPlaceholder: true };
}

async function writeState(state) {
  const { error } = await supabase.from("app_state").upsert({ key: STATE_KEY, value: state });
  if (error) throw new Error(`Failed to save counter: ${error.message}`);
}

async function getState() {
  return readState();
}

async function persistAndBroadcast(state) {
  await writeState(state);
  channel.broadcast("update", state);
  return state;
}

// A real increment (e.g. a future order-feed webhook) moves the number but
// doesn't by itself make it a verified total — isPlaceholder only clears via
// setTotal, the explicit "a human confirmed this number" action.
async function increment(units) {
  if (!Number.isInteger(units) || units <= 0) {
    throw new RangeError("units must be a positive integer");
  }
  if (units > MAX_UNITS_PER_CALL) {
    throw new RangeError(`units must be <= ${MAX_UNITS_PER_CALL} per call`);
  }
  const current = await readState();
  const next = { total: current.total + units, asOf: new Date().toISOString(), isPlaceholder: current.isPlaceholder };
  return persistAndBroadcast(next);
}

async function setTotal(total) {
  if (!Number.isInteger(total) || total < 0) {
    throw new RangeError("total must be a non-negative integer");
  }
  const next = { total, asOf: new Date().toISOString(), isPlaceholder: false };
  return persistAndBroadcast(next);
}

function subscribe(req, res) {
  channel.addClient(req, res);
}

module.exports = { getState, increment, setTotal, subscribe };
