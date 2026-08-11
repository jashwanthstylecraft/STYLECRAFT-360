const express = require("express");
const { getHomeSummary } = require("../services/homeService");
const { getHomeInsights } = require("../services/homeInsightsService");

const router = express.Router();

router.get("/summary", (req, res) => {
  const { from, to, period } = req.query;
  res.json(getHomeSummary(period, { from, to }));
});

router.get("/insights", (req, res) => {
  const { from, to } = req.query;
  res.json(getHomeInsights({ from, to }));
});

module.exports = router;
