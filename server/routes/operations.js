const express = require("express");
const { getOperationsMetrics } = require("../services/operationsService");

const router = express.Router();

router.get("/metrics", (req, res) => {
  const { from, to, period } = req.query;
  res.json(getOperationsMetrics(period, { from, to }));
});

module.exports = router;
