const express = require("express");
const sharedRegistry = require("../data/sharedRegistry");
const hiddenMetrics = require("../data/hiddenMetrics");

const router = express.Router();

// Removes a built-in metric from every view without touching its historical
// values/goals (see data/hiddenMetrics.js) — a custom metric is deleted
// outright instead, via DELETE /api/custom-metrics/:slug.
router.post("/:slug", async (req, res) => {
  const { slug } = req.params;
  if (!sharedRegistry.getMetricIncludingHidden(slug)) return res.status(404).json({ error: `No metric "${slug}" found.` });

  try {
    await hiddenMetrics.hideMetric(slug);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restores a hidden metric — its history was never touched, so it comes
// back exactly as it was.
router.delete("/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    await hiddenMetrics.unhideMetric(slug);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
