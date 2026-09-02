const express = require("express");
const customMetrics = require("../data/customMetrics");
const sharedRegistry = require("../data/sharedRegistry");
const repository = require("../data/repository");
const snapshotService = require("../services/snapshotService");

const router = express.Router();

const DEPARTMENT_KEYS = ["sales", "inventory", "finance", "operations", "marketing", "customer-service"];

router.get("/", (req, res) => {
  res.json({ metrics: customMetrics.getCustomMetrics() });
});

// A brand-new metric needs a stub {slug, values: {}, goals: {}} entry in its
// department's snapshot data immediately, not just a registry row — the
// department page reads from stored sparse data (toPositionalDepartment
// iterates sparseSource.METRICS, not the registry), so without this the new
// card simply wouldn't appear until the first Data Entry save happened to
// touch it. The `goals: {}` matters just as much as `values: {}`:
// entryService's buildMetricRow sets `hasGoal = Boolean(metric?.goals)`, and
// the Data Entry form only renders a Goal input at all when hasGoal is true
// — without it, a new metric would only ever get a Result box.
router.post("/", async (req, res) => {
  const { name, department } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "A metric title is required." });
  if (!DEPARTMENT_KEYS.includes(department)) return res.status(400).json({ error: "Choose a valid department." });

  let metric;
  try {
    const isSlugTaken = (slug) => Boolean(sharedRegistry.getMetric(slug));
    metric = await customMetrics.addCustomMetric({ name: String(name).trim(), department }, isSlugTaken);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    const departments = {};
    for (const key of DEPARTMENT_KEYS) {
      const sparse = repository.getSparseDepartmentData(key);
      departments[key] = { METRICS: sparse.METRICS.map((m) => ({ ...m })) };
    }
    departments[department].METRICS.push({ slug: metric.slug, values: {}, goals: {} });
    await snapshotService.commitSnapshot(departments, {
      filename: `Add custom metric ${metric.slug}`,
      note: `Added custom metric "${metric.name}" to ${department}`,
      source: "Manual entry",
    });
    res.json({ ok: true, metric });
  } catch (err) {
    // The registry row already exists at this point — roll it back rather
    // than leave a metric that shows up in Settings but nowhere else (the
    // exact half-created state a transient failure here produced once).
    await customMetrics.removeCustomMetric(metric.slug).catch(() => {});
    res.status(500).json({ error: `Couldn't finish creating the metric — please try again. (${err.message})` });
  }
});

// Removing a custom metric also has to strip its historical values/goals
// from whichever department's snapshot data holds them — an orphaned sparse
// entry with no matching registry metric has no chartType/format/name to
// render with (see repository.js's mergeWithRegistry: an unmatched slug is
// passed through with numbers only), which would break that department's
// page rather than just disappear cleanly.
router.delete("/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    await customMetrics.removeCustomMetric(slug);

    const departments = {};
    for (const key of DEPARTMENT_KEYS) {
      const sparse = repository.getSparseDepartmentData(key);
      departments[key] = { METRICS: sparse.METRICS.filter((m) => m.slug !== slug) };
    }
    await snapshotService.commitSnapshot(departments, {
      filename: `Remove custom metric ${slug}`,
      note: `Removed custom metric "${slug}" and its historical data`,
      source: "Manual entry",
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
