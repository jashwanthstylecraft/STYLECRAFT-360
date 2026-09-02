const express = require("express");
const sharedRegistry = require("../data/sharedRegistry");
const metricNameOverrides = require("../data/metricNameOverrides");

const router = express.Router();

const DEPARTMENT_KEYS = ["sales", "inventory", "finance", "operations", "marketing", "customer-service"];

// Every renameable graph across every department, in display order — the
// Settings "Rename graphs" list. Names already reflect any override, since
// getDepartmentMetrics applies it (see sharedRegistry.js).
router.get("/", (req, res) => {
  const metrics = DEPARTMENT_KEYS.flatMap((department) =>
    sharedRegistry.getDepartmentMetrics(department).map((m) => ({
      slug: m.slug,
      name: m.name,
      department,
      isCustom: Boolean(m.isCustom),
      isRenamed: metricNameOverrides.hasOverride(m.slug),
    }))
  );
  res.json({ metrics });
});

router.put("/:slug", async (req, res) => {
  const { slug } = req.params;
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "A title is required." });
  if (!sharedRegistry.getMetric(slug)) return res.status(404).json({ error: `No metric "${slug}" found.` });

  try {
    await metricNameOverrides.setMetricNameOverride(slug, String(name).trim());
    res.json({ ok: true, slug, name: String(name).trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reverts to the metric's original name (the shared/metricRegistry.mjs
// entry's built-in name, or the name a custom metric was created with).
router.delete("/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    await metricNameOverrides.clearMetricNameOverride(slug);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
