// One-off Phase 6 ingestion commit — run once, by hand, after the dry-run
// reconciliation report (server/data/seed/_archive/phase6-dry-run-report.md)
// was reviewed and approved. Loads the exact department data that dry run
// produced (server/data/seed/_archive/phase6-committed-departments.json —
// kept for the audit trail) and writes it as the very first version via the
// same commitSnapshot() every XLSX upload and Data Entry save uses ("one
// data store, two doors"). Safe to leave in the repo afterward as a record
// of how Version 1 was produced; re-running it would just create a new,
// identical version on top (commitSnapshot always appends, never mutates).
const fs = require("fs");
const path = require("path");
const snapshotService = require("../services/snapshotService");

const departmentsPath = path.join(__dirname, "..", "data", "seed", "_archive", "phase6-committed-departments.json");
const rawDepartments = JSON.parse(fs.readFileSync(departmentsPath, "utf-8"));

const departments = {};
for (const [deptKey, metrics] of Object.entries(rawDepartments)) {
  departments[deptKey] = { METRICS: metrics };
}

const meta = snapshotService.commitSnapshot(departments, {
  filename: "Raw Data.html (real StyleCraft business data, 231 weeks, 2022-10-14 to 2027-03-12)",
  note: "Initial real-data load",
  source: "Upload",
});

console.log("Committed:", JSON.stringify(meta, null, 2));
