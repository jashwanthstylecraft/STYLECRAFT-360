const express = require("express");
const { getMetricDetail } = require("../services/detailService");

const router = express.Router();

router.get("/:department/:slug", (req, res) => {
  const { department, slug } = req.params;
  const { from, to, period } = req.query;
  const result = getMetricDetail(department, slug, period, { from, to });
  if (!result) {
    res.status(404).json({ error: `No metric "${slug}" found in department "${department}".` });
    return;
  }
  res.json(result);
});

module.exports = router;
