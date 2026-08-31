const express = require("express");
const { getHomeSummary } = require("../services/homeService");
const { getHomeInsights } = require("../services/homeInsightsService");

const router = express.Router();

router.get("/summary", async (req, res) => {
  const { from, to, period } = req.query;
  try {
    res.json(await getHomeSummary(period, { from, to }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/insights", (req, res) => {
  const { from, to, visibleFrom } = req.query;
  res.json(getHomeInsights({ from, to, visibleFrom }));
});

module.exports = router;
