const express = require("express");
const { getInventoryMetrics } = require("../services/inventoryService");

const router = express.Router();

router.get("/metrics", (req, res) => {
  const { from, to, period } = req.query;
  res.json(getInventoryMetrics(period, { from, to }));
});

module.exports = router;
