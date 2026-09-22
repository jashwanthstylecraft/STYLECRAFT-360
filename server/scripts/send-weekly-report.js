// Sends the weekly dashboard-overview email — the same report the
// "/api/cron/weekly-report" route (routes/cron.js) sends automatically
// every Saturday via Vercel Cron. This script is for a manual/on-demand
// send (`node scripts/send-weekly-report.js`), e.g. to test changes to the
// report before the next scheduled run.
//
// Configuration is entirely via env vars (server/.env locally, Vercel
// project env vars in production) — nothing here is hardcoded:
//   GMAIL_USER            — the sending mailbox (needs 2-Step Verification on)
//   GMAIL_APP_PASSWORD    — an App Password generated for that mailbox
//   REPORT_RECIPIENTS     — comma-separated recipient list; defaults to the
//                           login allowlist (data/allowedEmails.js) if unset,
//                           same as the automated Saturday send
//   REPORT_METRIC_SLUGS   — comma-separated metric slugs to include
//                           (falls back to a small default set if unset)
try {
  process.loadEnvFile();
} catch {
  // No .env file present — fine; real env vars (e.g. on Vercel) still apply.
}

const sharedRegistry = require("../data/sharedRegistry");
const repository = require("../data/repository");
const customMetrics = require("../data/customMetrics");
const metricNameOverrides = require("../data/metricNameOverrides");
const hiddenMetrics = require("../data/hiddenMetrics");
const allowedEmails = require("../data/allowedEmails");
const { buildWeeklyReport } = require("../services/weeklyReportService");
const { sendMail } = require("../services/emailService");

// A sensible starting default — one headline metric per department — used
// only until REPORT_METRIC_SLUGS is set to the actual "specific graphs"
// wanted.
const DEFAULT_SLUGS = [
  "us-b2b-invoiced",
  "inventory-level",
  "weekly-gross-margin",
  "shipping-time-days",
  "new-social-follow-subs",
  "customer-returns",
];

async function main() {
  // Same bootstrap app.js's per-request middleware does — the shared
  // registry's dynamic ESM import, then a fresh read of every Supabase-backed
  // cache — since this script runs standalone, outside any request.
  await sharedRegistry.ready;
  await Promise.all([
    repository.ensureFreshSnapshot(),
    customMetrics.ensureFreshCustomMetrics(),
    metricNameOverrides.ensureFreshMetricNameOverrides(),
    hiddenMetrics.ensureFreshHiddenMetrics(),
    allowedEmails.ensureFreshAllowedEmails(),
  ]);

  const envRecipients = (process.env.REPORT_RECIPIENTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const recipients = envRecipients.length ? envRecipients : allowedEmails.getAllowedEmails();

  const slugs = (process.env.REPORT_METRIC_SLUGS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const report = buildWeeklyReport(slugs.length ? slugs : DEFAULT_SLUGS);
  if (report.missing.length) {
    console.warn("Skipped (no matching metric found):", report.missing.join(", "));
  }

  await sendMail({ to: recipients, subject: report.subject, html: report.html, text: report.text });
  console.log(`Sent to ${recipients.join(", ")} — ${report.found.length} metric(s), week ending ${report.weekEnding}.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
