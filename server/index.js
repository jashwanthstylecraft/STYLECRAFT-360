const express = require("express");
const cors = require("cors");
const salesRouter = require("./routes/sales");
const inventoryRouter = require("./routes/inventory");
const financeRouter = require("./routes/finance");
const operationsRouter = require("./routes/operations");
const counterRouter = require("./routes/counter");
const homeRouter = require("./routes/home");
const dataRouter = require("./routes/data");
const entryRouter = require("./routes/entry");
const detailRouter = require("./routes/detail");
const { requireAuth } = require("./middleware/auth");
const sharedRegistry = require("./data/sharedRegistry");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(requireAuth);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/sales", salesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/finance", financeRouter);
app.use("/api/operations", operationsRouter);
app.use("/api/counter", counterRouter);
app.use("/api/home", homeRouter);
app.use("/api/data", dataRouter);
app.use("/api/entry", entryRouter);
app.use("/api/detail", detailRouter);

// The shared metric registry is genuine ESM (so the Vite client can import
// the exact same source with no build step); this CJS server bridges it via
// a dynamic import that must resolve before any request can be served.
sharedRegistry.ready.then(() => {
  app.listen(PORT, () => {
    console.log(`StyleCraft 360 API listening on http://localhost:${PORT}`);
  });
});
