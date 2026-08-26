const express = require("express");
const { getCustomerServiceMetrics } = require("../services/customerServiceService");

const router = express.Router();

router.get("/metrics", (req, res) => {
  const { from, to, period } = req.query;
  res.json(getCustomerServiceMetrics(period, { from, to }));
});

module.exports = router;
