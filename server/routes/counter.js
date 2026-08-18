const express = require("express");
const counterService = require("../services/counterService");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
  const { total, asOf, isPlaceholder } = counterService.getState();
  res.json({ total, asOf, isPlaceholder });
});

router.get("/stream", (req, res) => {
  counterService.subscribe(req, res);
});

router.post("/increment", requireRole("admin"), (req, res) => {
  const { units } = req.body || {};
  try {
    const state = counterService.increment(units);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/", requireRole("admin"), (req, res) => {
  const { total } = req.body || {};
  try {
    const state = counterService.setTotal(total);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
