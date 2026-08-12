const express = require("express");
const { buildExportWorkbook } = require("../services/exportService");

const router = express.Router();

router.get("/excel", (req, res) => {
  const { from, to } = req.query;
  try {
    const { buffer, filename } = buildExportWorkbook({ from, to });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
