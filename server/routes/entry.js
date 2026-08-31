const express = require("express");
const entryService = require("../services/entryService");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(entryService.getEntryData(req.query.week));
});

router.get("/coverage", (req, res) => {
  res.json(entryService.getCoverage());
});

router.put("/week/:weekEnding", async (req, res) => {
  const { entries, note } = req.body || {};
  try {
    const result = await entryService.saveWeek({ weekEnding: req.params.weekEnding, entries, note });
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
