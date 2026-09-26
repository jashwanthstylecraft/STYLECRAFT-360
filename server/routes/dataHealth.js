// Admin-only, read-only — runs on demand from a Settings button, never on
// a schedule and never wired into the dashboard itself yet (see
// dataHealthService.js). Nothing here writes to any metric.
const express = require("express");
const { checkDataHealth } = require("../services/dataHealthService");

const router = express.Router();

router.get("/", (req, res) => {
  try {
    res.json({ findings: checkDataHealth() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
