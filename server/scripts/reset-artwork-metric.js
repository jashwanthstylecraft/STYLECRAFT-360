// One-off bulk correction: "Artwork Out the Door" (slug milkshake-units-prepped)
// had leftover values/goals from before it was renamed from the old
// "Milkshake" placeholder concept. Per explicit user instruction: every past
// week becomes value=0, goal=2, except 2026-08-07 which is value=4, goal=2;
// future (not-yet-occurred) weeks get goal=2 only — never a fabricated
// actual for a week that hasn't happened. Written as ONE commitSnapshot()
// call (like uploadService/entryService do) so this lands as a single
// version-history entry instead of ~200 individual saves.
const repository = require("../data/repository");
const sharedRegistry = require("../data/sharedRegistry");
const snapshotService = require("./../services/snapshotService");

const SLUG = "milkshake-units-prepped";
const EXCEPTION_WEEK = "2026-08-07";
const EXCEPTION_VALUE = 4;
const DEFAULT_VALUE = 0;
const GOAL = 2;
const DEPARTMENT_KEYS = ["sales", "inventory", "finance", "operations"];

async function main() {
  await sharedRegistry.ready;
  const currentWeek = sharedRegistry.currentWeek(new Date());
  const allWeeks = sharedRegistry.generateWeeks();

  const departments = {};
  for (const departmentKey of DEPARTMENT_KEYS) {
    const sparse = repository.getSparseDepartmentData(departmentKey);
    if (departmentKey !== "operations") {
      departments[departmentKey] = { METRICS: sparse.METRICS.map((m) => ({ slug: m.slug, values: m.values ?? {}, ...(m.goals ? { goals: m.goals } : {}) })) };
      continue;
    }

    const METRICS = sparse.METRICS.map((m) => {
      if (m.slug !== SLUG) {
        return { slug: m.slug, values: m.values ?? {}, ...(m.goals ? { goals: m.goals } : {}) };
      }

      const values = {};
      const goals = {};
      for (const week of allWeeks) {
        const iso = week.weekEnding;
        goals[iso] = GOAL;
        if (iso <= EXCEPTION_WEEK) {
          values[iso] = iso === EXCEPTION_WEEK ? EXCEPTION_VALUE : DEFAULT_VALUE;
        }
        // future weeks (iso > EXCEPTION_WEEK, up through currentWeek and beyond):
        // goal only, no fabricated actual.
      }
      console.log(`operations/${SLUG}: ${Object.keys(values).length} value weeks, ${Object.keys(goals).length} goal weeks (currentWeek=${currentWeek})`);
      return { slug: m.slug, values, goals };
    });

    departments[departmentKey] = { METRICS };
  }

  const meta = snapshotService.commitSnapshot(departments, {
    filename: "Artwork Out the Door — full history reset",
    note: "Reset all weeks to value=0/goal=2 except 2026-08-07 (value=4/goal=2); future weeks get goal=2 only, no fabricated actuals.",
    source: "Manual entry",
  });
  console.log("Committed:", meta);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
