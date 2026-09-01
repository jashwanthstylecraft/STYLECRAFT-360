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

router.post("/", async (req, res) => {
  const { name, department } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "A metric title is required." });
  if (!DEPARTMENT_KEYS.includes(department)) return res.status(400).json({ error: "Choose a valid department." });

  try {
    const isSlugTaken = (slug) => Boolean(sharedRegistry.getMetric(slug));
    const metric = await customMetrics.addCustomMetric({ name: String(name).trim(), department }, isSlugTaken);
    res.json({ ok: true, metric });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
