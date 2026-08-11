const express = require("express");
const { getFinanceMetrics } = require("../services/financeService");

const router = express.Router();

router.get("/metrics", (req, res) => {
  const { from, to, period } = req.query;
  res.json(getFinanceMetrics(period, { from, to }));
});

module.exports = router;
