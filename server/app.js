try {
  process.loadEnvFile();
} catch {
  // No .env file present — fine; SESSION_SECRET (if set) comes from a real
  // env var, otherwise auth.js falls back to an in-memory dev secret.
}

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const salesRouter = require("./routes/sales");
const inventoryRouter = require("./routes/inventory");
const financeRouter = require("./routes/finance");
const operationsRouter = require("./routes/operations");
const marketingRouter = require("./routes/marketing");
const customerServiceRouter = require("./routes/customerService");
const counterRouter = require("./routes/counter");
const homeRouter = require("./routes/home");
const dataRouter = require("./routes/data");
const entryRouter = require("./routes/entry");
const detailRouter = require("./routes/detail");
const exportRouter = require("./routes/export");
const authRouter = require("./routes/auth");
const usersRouter = require("./routes/users");
const { requireAuth, requireRole } = require("./middleware/auth");
const repository = require("./data/repository");
const customMetrics = require("./data/customMetrics");
const customMetricsRouter = require("./routes/customMetrics");

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Must be reachable before requireAuth — this IS the login flow.
app.use("/api/auth", authRouter);

app.use(requireAuth);

// Keeps repository.js's in-memory active-snapshot cache from going stale —
// see the big comment at the top of data/repository.js for why this is a
// short-TTL cache-refresh rather than threading async through the ~13
// files that read department data.
app.use(async (req, res, next) => {
  try {
    await repository.ensureFreshSnapshot();
    await customMetrics.ensureFreshCustomMetrics();
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/sales", salesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/finance", financeRouter);
app.use("/api/operations", operationsRouter);
app.use("/api/marketing", marketingRouter);
app.use("/api/customer-service", customerServiceRouter);
app.use("/api/home", homeRouter);
app.use("/api/detail", detailRouter);
app.use("/api/counter", counterRouter);

// Data Entry and Team management are admin-only, wholesale — viewers get
// zero access, GET included. `data.js` is more nuanced: its own routes are
// gated per-route internally, because /status and /stream are the app-wide
// date-anchoring + live-update mechanism every dashboard depends on
// (viewers included) — only the upload/apply/template/versions routes are
// actually admin-only.
app.use("/api/entry", requireRole("admin"), entryRouter);
app.use("/api/data", dataRouter);
app.use("/api/export", requireRole("admin"), exportRouter);
app.use("/api/users", requireRole("admin"), usersRouter);
app.use("/api/custom-metrics", requireRole("admin"), customMetricsRouter);

module.exports = app;
