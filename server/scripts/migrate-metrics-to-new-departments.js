// One-off: shared/metricRegistry.mjs's `department` field for 5 metrics was
// just changed (operations -> marketing/customer-service, per the
// futureDepartment tags that were already there for exactly this purpose —
// see README's "How to add a department" / non-negotiables). Changing the
// registry field alone doesn't move the REAL stored sparse data, which still
// sits under the snapshot's `operations` bucket — this migrates it into new
// `marketing` / `customer-service` buckets in ONE commitSnapshot() call, so
// it lands as a single version-history entry instead of being silently
// orphaned under the old department.
const repository = require("../data/repository");
const sharedRegistry = require("../data/sharedRegistry");
const snapshotService = require("./../services/snapshotService");

const MOVES = {
  "new-social-follow-subs": "marketing",
  "product-reviews": "marketing",
  "defective-returns": "customer-service",
  "repair-rate": "customer-service",
  "customer-returns": "customer-service",
};

async function main() {
  await sharedRegistry.ready;

  const operations = repository.getSparseDepartmentData("operations");
  const newBuckets = { marketing: [], "customer-service": [] };
  const remainingOperations = [];

  for (const m of operations.METRICS) {
    const target = MOVES[m.slug];
    if (target) {
      newBuckets[target].push({ slug: m.slug, values: m.values ?? {}, ...(m.goals ? { goals: m.goals } : {}) });
    } else {
      remainingOperations.push({ slug: m.slug, values: m.values ?? {}, ...(m.goals ? { goals: m.goals } : {}) });
    }
  }

  const departments = { operations: { METRICS: remainingOperations } };
  for (const deptKey of ["sales", "inventory", "finance"]) {
    const sparse = repository.getSparseDepartmentData(deptKey);
    departments[deptKey] = { METRICS: sparse.METRICS.map((m) => ({ slug: m.slug, values: m.values ?? {}, ...(m.goals ? { goals: m.goals } : {}) })) };
  }
  departments.marketing = { METRICS: newBuckets.marketing };
  departments["customer-service"] = { METRICS: newBuckets["customer-service"] };

  console.log("Moved to marketing:", newBuckets.marketing.map((m) => m.slug));
  console.log("Moved to customer-service:", newBuckets["customer-service"].map((m) => m.slug));
  console.log("Remaining in operations:", remainingOperations.map((m) => m.slug));

  const meta = snapshotService.commitSnapshot(departments, {
    filename: "Migrate 5 metrics to Marketing / Customer Service",
    note: "Registry department field changed for NEW Social Follow/Subs, # of Product Reviews (-> marketing) and Defective Returns, Repair Rate %, Customer Returns (-> customer-service); this migrates their real stored data to match.",
    source: "Manual entry",
  });
  console.log("Committed:", meta);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
