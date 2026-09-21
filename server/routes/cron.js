// Triggered by Vercel Cron (see vercel.json's "crons" entry) — not by any
// user action, so it's mounted in app.js BEFORE requireAuth and guards
// itself with CRON_SECRET instead of a session cookie. When CRON_SECRET is
// set as a Vercel env var, Vercel automatically sends it back as
// `Authorization: Bearer <value>` on every cron invocation (see
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs) —
// anything else (a stray request straight to the URL) is rejected.
const express = require("express");
const sharedRegistry = require("../data/sharedRegistry");
const repository = require("../data/repository");
const customMetrics = require("../data/customMetrics");
const metricNameOverrides = require("../data/metricNameOverrides");
const hiddenMetrics = require("../data/hiddenMetrics");
const { ALLOWED_EMAILS } = require("../data/allowedEmails");
const { buildWeeklyReport } = require("../services/weeklyReportService");
const { sendMail } = require("../services/emailService");

const router = express.Router();

// The curated highlight set (one headline metric per department) — the
// user explicitly chose this over a full every-metric dump when this was
// wired up. Override with REPORT_METRIC_SLUGS (comma-separated) if that
// choice ever changes without touching code.
const DEFAULT_SLUGS = [
  "us-b2b-invoiced",
  "inventory-level",
  "weekly-gross-margin",
  "shipping-time-days",
  "new-social-follow-subs",
  "customer-returns",
];

router.get("/weekly-report", async (req, res) => {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await sharedRegistry.ready;
    await Promise.all([
      repository.ensureFreshSnapshot(),
      customMetrics.ensureFreshCustomMetrics(),
      metricNameOverrides.ensureFreshMetricNameOverrides(),
      hiddenMetrics.ensureFreshHiddenMetrics(),
    ]);

    const slugs = (process.env.REPORT_METRIC_SLUGS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const report = buildWeeklyReport(slugs.length ? slugs : DEFAULT_SLUGS);
    await sendMail({ to: ALLOWED_EMAILS, subject: report.subject, html: report.html, text: report.text });

    res.json({ ok: true, sentTo: ALLOWED_EMAILS.length, weekEnding: report.weekEnding, metrics: report.found.length, missing: report.missing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
