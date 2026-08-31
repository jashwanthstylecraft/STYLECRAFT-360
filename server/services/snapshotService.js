// The ONE place a validated {departments} object gets written as the new
// active snapshot — versioned, pointer-swapped, and broadcast over SSE.
// Both the XLSX upload path (uploadService.js) and the Data Entry save path
// (entryService.js) call commitSnapshot() here; neither duplicates this
// logic. "One data store, two doors."
const repository = require("../data/repository");
const supabase = require("../data/supabaseClient");
const { createChannel } = require("./sseHub");

const MAX_VERSIONS = 20;

const dataChannel = createChannel();

// Keeps only the MAX_VERSIONS most recent snapshot rows. Non-fatal on
// failure (logged, not thrown) — a save should never fail just because
// cleanup of old versions hit a hiccup.
async function pruneOldVersions() {
  const { data, error } = await supabase.from("snapshots").select("id").order("id", { ascending: false });
  if (error) throw new Error(`Failed to check old snapshots: ${error.message}`);
  const staleIds = (data ?? []).slice(MAX_VERSIONS).map((r) => r.id);
  if (staleIds.length === 0) return;
  const { error: deleteError } = await supabase.from("snapshots").delete().in("id", staleIds);
  if (deleteError) throw new Error(`Failed to prune old snapshots: ${deleteError.message}`);
}

// `meta` carries whatever the caller wants shown in version history —
// filename, note, and `source` ("Upload" | "Manual entry").
async function commitSnapshot(departments, meta) {
  const timestamp = Date.now();
  const fullMeta = {
    file: `${timestamp}.json`, // kept for shape-compat (restoreVersion still takes this as its id)
    timestamp,
    appliedAt: new Date(timestamp).toISOString(),
    note: "",
    ...meta,
  };

  const { error: insertError } = await supabase.from("snapshots").insert({
    id: timestamp,
    applied_at: fullMeta.appliedAt,
    note: fullMeta.note,
    filename: fullMeta.filename,
    source: fullMeta.source,
    departments,
  });
  if (insertError) throw new Error(`Failed to save snapshot: ${insertError.message}`);

  const { error: pointerError } = await supabase.from("app_state").upsert({ key: "active_snapshot", value: fullMeta });
  if (pointerError) throw new Error(`Failed to update active pointer: ${pointerError.message}`);

  repository.setCachedSnapshot({ departments, meta: fullMeta });

  try {
    await pruneOldVersions();
  } catch (err) {
    console.warn("[snapshotService] pruneOldVersions failed (non-fatal):", err.message);
  }

  dataChannel.broadcast("data-updated", fullMeta);
  return fullMeta;
}

async function listVersions() {
  const activeMeta = repository.getActiveSnapshotMeta();
  const { data, error } = await supabase
    .from("snapshots")
    .select("id, applied_at, note, filename, source")
    .order("id", { ascending: false });
  if (error) throw new Error(`Failed to list versions: ${error.message}`);

  return data.map((row) => ({
    file: `${row.id}.json`,
    timestamp: row.id,
    appliedAt: row.applied_at,
    note: row.note,
    filename: row.filename,
    source: row.source,
    active: row.id === activeMeta?.timestamp,
  }));
}

async function restoreVersion(snapshotFile) {
  const timestamp = Number(String(snapshotFile).replace(/\.json$/, ""));
  const { data: row, error } = await supabase.from("snapshots").select("*").eq("id", timestamp).maybeSingle();
  if (error) throw new Error(`Failed to look up that version: ${error.message}`);
  if (!row) throw new Error("That version no longer exists.");

  const meta = {
    file: `${row.id}.json`,
    timestamp: row.id,
    appliedAt: row.applied_at,
    note: row.note,
    filename: row.filename,
    source: row.source,
  };

  const { error: pointerError } = await supabase.from("app_state").upsert({ key: "active_snapshot", value: meta });
  if (pointerError) throw new Error(`Failed to restore version: ${pointerError.message}`);

  repository.setCachedSnapshot({ departments: row.departments, meta });
  dataChannel.broadcast("data-updated", meta);
  return meta;
}

function subscribeToDataUpdates(req, res) {
  dataChannel.addClient(req, res);
}

module.exports = { commitSnapshot, listVersions, restoreVersion, subscribeToDataUpdates };
