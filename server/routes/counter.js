const express = require("express");
const counterService = require("../services/counterService");
const unitsBySkuService = require("../services/unitsBySkuService");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { total, asOf, isPlaceholder } = await counterService.getState();
    res.json({ total, asOf, isPlaceholder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// The breakdown behind the Home page counter — what someone sees after
// clicking "Lifetime units sold". Same visibility as the counter itself
// (any signed-in viewer, not admin-only): refreshed by the same Saturday
// cron that updates the counter's total (see routes/cron.js).
router.get("/units-by-sku", async (req, res) => {
  try {
    res.json(await unitsBySkuService.getUnitsBySku());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// See the matching comment in routes/data.js — Vercel can't hold this open
// regardless, and ending it immediately instead of registering it keeps
// any still-retrying stale client cheap (near-instant) instead of costing
// the full 300-second platform timeout per attempt.
router.get("/stream", (req, res) => {
  if (process.env.VERCEL) return res.status(204).end();
  counterService.subscribe(req, res);
});

router.post("/increment", requireRole("admin"), async (req, res) => {
  const { units } = req.body || {};
  try {
    const state = await counterService.increment(units);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/", requireRole("admin"), async (req, res) => {
  const { total } = req.body || {};
  try {
    const state = await counterService.setTotal(total);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
