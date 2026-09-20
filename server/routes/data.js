const express = require("express");
const multer = require("multer");
const repository = require("../data/repository");
const uploadService = require("../services/uploadService");
const { generateTemplateWorkbook } = require("../services/templateService");
const sharedRegistry = require("../data/sharedRegistry");
const { requireRole } = require("../middleware/auth");

const router = express.Router();
const adminOnly = requireRole("admin");

const DEPARTMENT_KEYS = ["sales", "inventory", "finance", "operations", "marketing", "customer-service"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isXlsx =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.originalname.toLowerCase().endsWith(".xlsx");
    cb(isXlsx ? null : new Error("Only .xlsx files are accepted"), isXlsx);
  },
});

router.get("/status", (req, res) => {
  const departmentMetricCounts = Object.fromEntries(
    DEPARTMENT_KEYS.map((key) => [key, sharedRegistry.getDepartmentMetrics(key).length])
  );
  res.json({
    isSampleData: repository.isUsingSampleData(),
    active: repository.getActiveSnapshotMeta(),
    latestDataWeekEnding: repository.getLatestDataWeekEndingAcrossDepartments(),
    departmentMetricCounts,
  });
});

router.get("/template", adminOnly, async (req, res) => {
  try {
    const buffer = await generateTemplateWorkbook();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="stylecraft-360-template.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/upload", adminOnly, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const result = uploadService.receiveUpload(req.file.buffer, req.file.originalname);
    res.json(result);
  });
});

router.post("/apply", adminOnly, async (req, res) => {
  const { uploadId, note } = req.body || {};
  if (!uploadId) return res.status(400).json({ error: "uploadId is required." });
  try {
    const meta = await uploadService.applyUpload(uploadId, note);
    res.json({ ok: true, meta });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/versions", adminOnly, async (req, res) => {
  try {
    res.json({ versions: await uploadService.listVersions() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/versions/:file/restore", adminOnly, async (req, res) => {
  try {
    const meta = await uploadService.restoreVersion(req.params.file);
    res.json({ ok: true, meta });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Vercel serverless functions can never actually hold this connection open
// — the platform kills it after its own (expensive, 300s) timeout
// regardless of anything this code does. Client-side, new page loads never
// call this at all anymore (VITE_ENABLE_SSE=false in production — see
// useDataUpdatesListener.js), but a browser tab left open since BEFORE
// that shipped is still running the old JS in memory and will keep
// retrying every few seconds forever. Ending the connection immediately
// instead of registering it turns each of those retries into a near-
// instant request instead of a 300-second-long one — ~100x cheaper, and
// the only fix possible from the server side for a client that can't be
// reached to reload.
router.get("/stream", (req, res) => {
  if (process.env.VERCEL) return res.status(204).end();
  uploadService.subscribeToDataUpdates(req, res);
});

module.exports = router;
