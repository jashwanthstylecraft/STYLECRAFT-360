// One-time (idempotent) migration: converts every uploads/*.json snapshot
// from the old POSITIONAL shape ({WEEKS, AS_OF, METRICS:[{slug,series,...}]})
// to the sparse ISO-keyed shape server/data/repository.js now expects
// ({METRICS:[{slug,values,goals}]}) — see server/data/sparseFormat.js.
//
// Every historical snapshot was written under the old fixed 10-week model
// (shared/weeks.mjs), so WEEK_ENDINGS from there is the correct positional
// alignment for ALL of them. Backs up the untouched uploads/ dir first and
// logs a per-file/per-department checksum (metric count, populated value
// count) before and after, so a mismatch is obvious immediately.
//
// Run with: node server/scripts/migrate-snapshots-to-sparse.js
const fs = require("fs");
const path = require("path");
const sharedRegistry = require("../data/sharedRegistry");
const { toSparse } = require("../data/sparseFormat");

const UPLOADS_DIR = path.join(__dirname, "..", "data", "uploads");
const DEPARTMENT_KEYS = ["sales", "inventory", "finance", "operations"];

function isSparseDepartment(dept) {
  return dept.METRICS.every((m) => "values" in m);
}

function valueCount(dept) {
  let count = 0;
  for (const metric of dept.METRICS) {
    if ("values" in metric) {
      count += Object.keys(metric.values ?? {}).length;
    } else if (Array.isArray(metric.series)) {
      count += metric.series.filter((v) => v !== null && v !== undefined).length;
    }
  }
  return count;
}

function convertDepartment(dept, weekEndings) {
  const METRICS = dept.METRICS.map((metric) => {
    const sparse = toSparse(metric, weekEndings);
    const clean = { slug: sparse.slug, values: sparse.values };
    if (sparse.goals) clean.goals = sparse.goals;
    return clean;
  });
  return { METRICS };
}

async function main() {
  await sharedRegistry.ready;
  const weekEndings = sharedRegistry.WEEK_ENDINGS;

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log("No uploads directory found — nothing to migrate.");
    return;
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => /^\d+\.json$/.test(f));
  if (files.length === 0) {
    console.log("No snapshot files found — nothing to migrate.");
    return;
  }

  const backupDir = path.join(UPLOADS_DIR, `_backup_${Date.now()}`);
  fs.mkdirSync(backupDir, { recursive: true });

  let migratedCount = 0;
  let alreadySparseCount = 0;

  for (const file of files) {
    const fullPath = path.join(UPLOADS_DIR, file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    fs.writeFileSync(path.join(backupDir, file), raw);

    const snapshot = JSON.parse(raw);
    const before = {};
    for (const key of DEPARTMENT_KEYS) {
      const dept = snapshot.departments?.[key];
      before[key] = dept ? { metrics: dept.METRICS.length, values: valueCount(dept) } : null;
    }

    const allAlreadySparse = DEPARTMENT_KEYS.every((key) => {
      const dept = snapshot.departments?.[key];
      return !dept || isSparseDepartment(dept);
    });

    if (allAlreadySparse) {
      alreadySparseCount++;
      console.log(`SKIP  ${file} — already sparse.`);
      continue;
    }

    for (const key of DEPARTMENT_KEYS) {
      const dept = snapshot.departments?.[key];
      if (!dept || isSparseDepartment(dept)) continue;
      snapshot.departments[key] = convertDepartment(dept, weekEndings);
    }

    const after = {};
    for (const key of DEPARTMENT_KEYS) {
      const dept = snapshot.departments?.[key];
      after[key] = dept ? { metrics: dept.METRICS.length, values: valueCount(dept) } : null;
    }

    for (const key of DEPARTMENT_KEYS) {
      const b = before[key];
      const a = after[key];
      if (!b && !a) continue;
      const mismatch = !b || !a || b.metrics !== a.metrics || b.values !== a.values;
      const flag = mismatch ? "MISMATCH" : "ok";
      console.log(
        `${mismatch ? "MISMATCH" : "match "}  ${file} [${key}] metrics ${b?.metrics ?? 0}->${a?.metrics ?? 0}, values ${b?.values ?? 0}->${a?.values ?? 0} (${flag})`
      );
    }

    fs.writeFileSync(fullPath, JSON.stringify(snapshot));
    migratedCount++;
    console.log(`DONE  ${file} — converted to sparse.`);
  }

  console.log(`\nMigrated ${migratedCount} file(s), ${alreadySparseCount} already sparse. Backup at ${backupDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
