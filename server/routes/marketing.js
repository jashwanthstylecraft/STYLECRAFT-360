const express = require("express");
const { getMarketingMetrics } = require("../services/marketingService");

const router = express.Router();

router.get("/metrics", (req, res) => {
  const { from, to, period } = req.query;
  res.json(getMarketingMetrics(period, { from, to }));
});

module.exports = router;
