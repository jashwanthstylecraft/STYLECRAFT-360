const express = require("express");
const { buildExportWorkbook } = require("../services/exportService");

const router = express.Router();

// Default-on: only an explicit "false" disables it (e.g. Vercel, where the
// Python/openpyxl child process this spawns doesn't run).
const EXPORT_ENABLED = process.env.ENABLE_EXCEL_EXPORT !== "false";

router.get("/excel", (req, res) => {
  if (!EXPORT_ENABLED) {
    return res.status(503).json({ error: "Excel export isn't available on this deployment." });
  }
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
