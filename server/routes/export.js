const express = require("express");
const { buildExportWorkbook, buildDataOnlyWorkbook } = require("../services/exportService");

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

// Data-only (no native charts), pure-JS — always available, unlike /excel
// above, since it never spawns Python. This is what actually works on
// Vercel, where ENABLE_EXCEL_EXPORT is set to "false" for exactly that
// reason.
router.get("/data", (req, res) => {
  const { from, to } = req.query;
  try {
    const { buffer, filename } = buildDataOnlyWorkbook({ from, to });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
