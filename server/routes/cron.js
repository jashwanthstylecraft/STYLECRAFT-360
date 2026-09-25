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
const allowedEmails = require("../data/allowedEmails");
const { buildWeeklyReport } = require("../services/weeklyReportService");
const { sendMail } = require("../services/emailService");
const { fetchDataForChartRows } = require("../services/googleSheetsFetcher");
const { planSyncFromRows, resolveWeekEnding, checkTargetLineDrift, TARGET_LINE_COLUMNS } = require("../scripts/sync-google-sheet");
const entryService = require("../services/entryService");

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
      allowedEmails.ensureFreshAllowedEmails(),
    ]);

    const slugs = (process.env.REPORT_METRIC_SLUGS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const recipients = allowedEmails.getAllowedEmails();
    const report = buildWeeklyReport(slugs.length ? slugs : DEFAULT_SLUGS);
    await sendMail({ to: recipients, subject: report.subject, html: report.html, text: report.text });

    res.json({ ok: true, sentTo: recipients.length, weekEnding: report.weekEnding, metrics: report.found.length, missing: report.missing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Replaces the old cloud-agent sync, whose sandbox couldn't reach this app
// at all (see googleSheetsFetcher.js's top comment). Runs in-process — no
// HTTP round-trip to itself, no session cookie — so it calls
// entryService.saveWeek() directly, same as a real Data Entry save. Same
// additive-only guarantee as before: saveWeek/planSyncFromRows never touch
// a week that already has data, and never guess a field they can't
// confidently resolve.
router.get("/weekly-sheet-sync", async (req, res) => {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await sharedRegistry.ready;
    // Loaded fresh before EVERY write below too, not just once here — see
    // the comment on the loop: a prior week's save updates the in-memory
    // snapshot cache itself (repository.js's setCachedSnapshot), so this
    // first call only has to cover the READ that decides what's already
    // there before planning anything.
    await repository.ensureFreshSnapshot();

    const latestDataWeekEnding = repository.getLatestDataWeekEndingAcrossDepartments();
    if (!latestDataWeekEnding) throw new Error("Could not determine the app's latest data week.");

    // Additive-only lookup for GOAL_SYNC_METRICS (currently just Website
    // Sales) — a future week already carrying a hand-set goal (e.g. via
    // GoalRangePanel) must never be overwritten by the sheet's value.
    function getExistingGoal(slug, weekEnding) {
      const metric = sharedRegistry.getMetric(slug);
      if (!metric) return null;
      const sparse = repository.getSparseDepartmentData(metric.department);
      const found = sparse.METRICS.find((m) => m.slug === slug);
      return found?.goals?.[weekEnding] ?? null;
    }

    const rows = await fetchDataForChartRows();
    const { toSync, unresolved } = planSyncFromRows(rows, latestDataWeekEnding, getExistingGoal);

    // Drift-only check for the 4 flat-constant goal columns (In-Stock %,
    // Shipping Time, Education Events, Social) — these have no per-week
    // storage in the app at all (see TARGET_LINE_COLUMNS' comment), so
    // there's nothing to write; this just flags it in the report if the
    // sheet's constant and the registry's targetLine ever disagree again,
    // for a human to reconcile by hand (never auto-applied).
    const anchorRow = rows.find((r) => resolveWeekEnding(r.week, latestDataWeekEnding) === latestDataWeekEnding);
    const targetLineDrift = anchorRow
      ? checkTargetLineDrift(
          anchorRow,
          Object.fromEntries(TARGET_LINE_COLUMNS.map((c) => [c.slug, sharedRegistry.getMetric(c.slug)?.targetLine ?? null]))
        )
      : [];

    const report = { anchorWeek: latestDataWeekEnding, synced: [], failed: [], unresolved, targetLineDrift };
    for (const plan of toSync) {
      // planSyncFromRows already sorted oldest-first; each saveWeek() call
      // updates the shared in-memory snapshot cache immediately (see
      // repository.js's setCachedSnapshot), so the NEXT iteration's
      // "already entered" check (inside planSyncFromRows, evaluated before
      // this loop) and this call both see every prior week's write —
      // exactly the same guarantee the old HTTP-based script had from
      // hitting the real API on each request.
      const result = await entryService.saveWeek({
        weekEnding: plan.weekEnding,
        entries: plan.entries,
        note: `Synced from Google Sheet (week of ${plan.week})`,
      });
      if (!result.ok) {
        report.failed.push({ week: plan.week, weekEnding: plan.weekEnding, errors: result.errors });
        break; // don't attempt later (newer) weeks if an earlier one failed — keep gaps from opening up
      }
      report.synced.push({
        week: plan.week,
        weekEnding: plan.weekEnding,
        fieldsWritten: Object.keys(plan.entries).length,
        fieldsSkipped: plan.fieldsSkipped,
      });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
