const express = require("express");
const { getSalesMetrics } = require("../services/salesService");

const router = express.Router();

router.get("/metrics", (req, res) => {
  const { from, to, period } = req.query;
  res.json(getSalesMetrics(period, { from, to }));
});

module.exports = router;
