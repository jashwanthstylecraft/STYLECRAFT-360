// The ONE place a validated {departments} object gets written as the new
// active snapshot — versioned, pointer-swapped, and broadcast over SSE.
// Both the XLSX upload path (uploadService.js) and the Data Entry save path
// (entryService.js) call commitSnapshot() here; neither duplicates this
// logic. "One data store, two doors."
const fs = require("fs");
const path = require("path");
const repository = require("../data/repository");
const { createChannel } = require("./sseHub");

const { UPLOADS_DIR, ACTIVE_POINTER_FILE } = repository;
const MAX_VERSIONS = 20;

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const dataChannel = createChannel();

function pruneOldVersions() {
  const files = fs
    .readdirSync(UPLOADS_DIR)
    .filter((f) => /^\d+\.json$/.test(f))
    .sort()
    .reverse();
  for (const file of files.slice(MAX_VERSIONS)) {
    fs.unlinkSync(path.join(UPLOADS_DIR, file));
  }
}

// `meta` carries whatever the caller wants shown in version history —
// filename, note, and `source` ("Upload" | "Manual entry").
function commitSnapshot(departments, meta) {
  const timestamp = Date.now();
  const snapshotFile = `${timestamp}.json`;
  const fullMeta = {
    file: snapshotFile,
    timestamp,
    appliedAt: new Date(timestamp).toISOString(),
    note: "",
    ...meta,
  };

  fs.writeFileSync(path.join(UPLOADS_DIR, snapshotFile), JSON.stringify({ departments, meta: fullMeta }));
  fs.writeFileSync(ACTIVE_POINTER_FILE, JSON.stringify(fullMeta));
  pruneOldVersions();
  dataChannel.broadcast("data-updated", fullMeta);
  return fullMeta;
}

function listVersions() {
  const activePointer = repository.getActiveSnapshotMeta();
  const files = fs
    .readdirSync(UPLOADS_DIR)
    .filter((f) => /^\d+\.json$/.test(f))
    .sort()
    .reverse();

  return files.map((file) => {
    const snapshot = JSON.parse(fs.readFileSync(path.join(UPLOADS_DIR, file), "utf-8"));
    // Pre-Phase-4 snapshots predate `source` — they were all uploads.
    return { source: "Upload", ...snapshot.meta, active: snapshot.meta.file === activePointer?.file };
  });
}

function restoreVersion(snapshotFile) {
  const fullPath = path.join(UPLOADS_DIR, snapshotFile);
  if (!fs.existsSync(fullPath)) {
    throw new Error("That version no longer exists.");
  }
  const snapshot = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  fs.writeFileSync(ACTIVE_POINTER_FILE, JSON.stringify(snapshot.meta));
  dataChannel.broadcast("data-updated", snapshot.meta);
  return snapshot.meta;
}

function subscribeToDataUpdates(req, res) {
  dataChannel.addClient(req, res);
}

module.exports = { commitSnapshot, listVersions, restoreVersion, subscribeToDataUpdates };
