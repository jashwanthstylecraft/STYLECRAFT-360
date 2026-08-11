const express = require("express");
const multer = require("multer");
const repository = require("../data/repository");
const uploadService = require("../services/uploadService");
const { generateTemplateWorkbook } = require("../services/templateService");

const router = express.Router();

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
  res.json({
    isSampleData: repository.isUsingSampleData(),
    active: repository.getActiveSnapshotMeta(),
    latestDataWeekEnding: repository.getLatestDataWeekEndingAcrossDepartments(),
  });
});

router.get("/template", (req, res) => {
  const buffer = generateTemplateWorkbook();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="stylecraft-360-template.xlsx"');
  res.send(buffer);
});

router.post("/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const result = uploadService.receiveUpload(req.file.buffer, req.file.originalname);
    res.json(result);
  });
});

router.post("/apply", (req, res) => {
  const { uploadId, note } = req.body || {};
  if (!uploadId) return res.status(400).json({ error: "uploadId is required." });
  try {
    const meta = uploadService.applyUpload(uploadId, note);
    res.json({ ok: true, meta });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/versions", (req, res) => {
  res.json({ versions: uploadService.listVersions() });
});

router.post("/versions/:file/restore", (req, res) => {
  try {
    const meta = uploadService.restoreVersion(req.params.file);
    res.json({ ok: true, meta });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/stream", (req, res) => {
  uploadService.subscribeToDataUpdates(req, res);
});

module.exports = router;
