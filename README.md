# StyleCraft 360

> The whole business, at a glance.

Internal executive dashboard for StyleCraft, replacing the weekly Excel report
with a live, responsive web app while preserving the report's structure
(executives are used to it).

- **Phase 1** shipped the **Sales** dashboard.
- **Phase 2** added **Inventory & Purchasing**, **Finance**, and **Operations**,
  plus the shared-component upgrades (goal direction, new chart variants) they
  needed. Customer Service, Marketing, and Manufacturing are still disabled in
  the sidebar; a few Operations metrics are tagged `futureDepartment` for when
  those pages are built.
- **Phase 3** added the live **Lifetime Units Sold** counter, the real **360
  View** home page, the **XLSX upload pipeline** (real data now drives every
  chart), and per-department **entrance/chart-draw animations**.

## Stack

- **Client:** React 18 + Vite, Tailwind CSS, Recharts, framer-motion,
  lucide-react, react-router-dom, TanStack Query
- **Server:** Node.js + Express, `xlsx` (SheetJS, installed from SheetJS's own
  CDN — the npm registry build has unpatched advisories), `multer` for
  uploads. Department data flows through a repository layer
  (`server/data/repository.js`) so it's sourced from an uploaded snapshot when
  one exists, falling back to seed data otherwise — no service ever reads a
  seed module directly.
- **Python 3 + openpyxl** (`server/requirements.txt`) — a genuine second
  runtime, used only by `server/scripts/build_export_workbook.py` to write
  real native Excel chart objects for `GET /api/export/excel`. SheetJS/`xlsx`
  can't create chart objects, so this is spawned as a child process
  (`PYTHON_BIN` env var, default `python`) rather than replacing the Node
  stack. Must be installed on any host serving that endpoint.

## Project structure

```
stylecraft-360/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/     # Sidebar, TopBar, PageShell, ProtectedRoute
│   │   │   ├── kpi/        # KpiCard, ResultGoalHeader, ValuesHeader, TrendArrow, AttainmentPill
│   │   │   ├── charts/     # WeeklyBarChart, StackedBarChart, GroupedBarChart,
│   │   │   │               # DualMetricGroupedChart, PaidUnpaidStackedChart,
│   │   │   │               # DivergingBarChart, PercentBarChart, ChartTooltip, ChartLegend
│   │   │   ├── dashboard/  # <Dept>SummaryStrip, StatTile — one strip per department
│   │   │   ├── counter/    # OdometerCounter, CompactCounter
│   │   │   ├── home/       # DepartmentHeadlineCard, ComingSoonCard, HealthStrip
│   │   │   └── data/       # UploadDropzone, ValidationReport, DiffPreview,
│   │   │                   # VersionHistoryList, SampleDataBadge
│   │   ├── config/         # departments.js — sidebar/routing registry
│   │   ├── lib/motion.js   # shared easing/stagger + per-department motion tables
│   │   ├── pages/          # Home360, Sales, Inventory, Finance, Operations, DataUpload, MetricDetail
│   │   ├── services/api.js # the only place that knows how data is fetched
│   │   ├── hooks/          # use<Dept>Metrics, useCounter, useHomeSummary,
│   │   │                   # useDataStatus/Versions, useDataUpdatesListener, usePrefersReducedMotion
│   │   └── utils/          # format.js (currency/percent/decimal/count), theme.js (chart colors)
└── server/
    ├── routes/              # sales/inventory/finance/operations, counter.js, home.js, data.js
    ├── services/
    │   ├── metricsHelpers.js   # shared attainment/WoW/result-series math (Phase 2+ services)
    │   ├── salesService.js     # Phase 1 — math untouched, now sources data via repository.js
    │   ├── inventoryService.js / financeService.js / operationsService.js
    │   ├── homeService.js      # headline metric + health score per department
    │   ├── counterService.js   # file-backed counter state + SSE + demo heartbeat
    │   ├── uploadService.js    # XLSX parse/validate/apply/version/restore
    │   ├── templateService.js  # generates the pre-filled download-template workbook
    │   └── sseHub.js           # tiny pub/sub used by both counter and data SSE streams
    ├── data/
    │   ├── seed/            # *Seed.js — placeholder data AND the structural catalog
    │   │                    # the XLSX parser merges uploaded numbers into
    │   ├── repository.js    # seed-vs-uploaded-snapshot resolution (read fresh every call)
    │   ├── state/counter.json     # persisted counter total (file-backed for now)
    │   └── uploads/*.json, active.json  # versioned snapshots + the "current" pointer
    └── middleware/auth.js   # Phase 1 stub, wired for Phase 4 role checks
```

## Setup

Requires Node.js 18+.

```bash
npm run install:all   # installs server/ and client/ dependencies
pip install -r server/requirements.txt   # openpyxl, for Excel export's native charts
npm run dev:all       # runs API (localhost:4000) + client (localhost:5173)
```

Or run them separately:

```bash
npm run server   # API on http://localhost:4000
npm run dev      # client on http://localhost:5173 (proxies /api to :4000)
```

Open http://localhost:5173.

`DEMO_COUNTER` (server env var, default unset = **on**) auto-increments the
counter by 1–8 units every 4–12 seconds so it visibly ticks in walkthroughs.
Set `DEMO_COUNTER=false` to disable it and drive the counter only via real
`POST /api/counter/increment` calls.

## API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/sales\|inventory\|finance\|operations/metrics?range=last10weeks` | Per-department metrics (unchanged shape from Phase 1/2, now `+isSampleData`) |
| `GET /api/home/summary` | Counter total + each department's headline metric + health score |
| `GET /api/counter` · `POST /api/counter/increment` `{units}` · `PUT /api/counter` `{total}` | Read / bump / admin-override the lifetime counter |
| `GET /api/counter/stream` | SSE — pushes `{total, asOf}` on every change |
| `GET /api/data/status` | `{isSampleData, active}` — drives the sample-data badge |
| `GET /api/data/template` | Downloads a workbook pre-filled with the current active data |
| `POST /api/data/upload` (multipart `file`) | Parses + validates only — returns `{uploadId, ok, errors, warnings, preview}`, never applies |
| `POST /api/data/apply` `{uploadId, note}` | Commits a previously-uploaded, error-free parse as the new active snapshot |
| `GET /api/data/versions` · `POST /api/data/versions/:file/restore` | List / roll back to a prior snapshot (last 20 kept) |
| `GET /api/data/stream` | SSE — broadcasts `data-updated` on every apply/restore |
| `GET /api/export/excel?from=&to=` | Streams `StyleCraft360_Data_<date>_<time>.xlsx` — `Graphs` (native charts, one per metric) + `Data` (canonical, round-trippable) sheets for the active snapshot. Omit `from`/`to` for the full first-to-last-data range. |

Every department response has the same shape as before:
`{ asOf, weeks, metrics, summary, isSampleData }`.

## The XLSX upload pipeline

**Workbook contract** — one sheet per department (`Sales`, `Inventory`,
`Finance`, `Operations`), plus an optional `Counter` sheet:

- Columns: `metric_slug | metric_name | goal | goal_label | goal_direction | <week1> | <week2> | …` —
  week columns are everything after column 5, in order, and may grow over time.
- A multi-series metric (stacked/grouped/dual) is one row per series, slug
  suffixed: `website-sales.stylecraft`, `in-stock-percentage.orderFill`, etc.
  An optional `<slug>.goalSeries` row supplies a week-varying goal line.
- **The spreadsheet only carries numbers.** Chart type, colors, series
  labels/keys, and formatting are structural metadata that live in each
  department's seed module (`server/data/seed/*Seed.js`), which doubles as
  the parser's lookup catalog by slug. A slug not found in the catalog is
  accepted as a new metric (default bar chart, currency format) and flagged
  as a warning — never silently dropped.
- **Download template** (`/data` page, or `GET /api/data/template`) generates
  this exact format from whatever is currently active, so re-uploading it
  unchanged always validates clean with zero diffs — that round-trip is
  covered by hand-testing before every release.

**Validation** (`server/services/uploadService.js`) runs fully before
anything is ever written: unknown sheet → warning (that department keeps its
previous data); missing required column, non-numeric week cell, duplicate
slug, or out-of-order week columns → error (row/column-specific message,
blocks Apply); unknown slug or an out-of-0–150%-range percentage → warning.
A blank cell parses to `null` (a genuine gap — rendered as "No data" in
tooltips); a `0` cell parses to `0` (a real zero bar). These are never
conflated anywhere in the pipeline.

**Apply is atomic**: a workbook is parsed and fully validated into an
in-memory/pending-file result first; `POST /apply` only ever commits that
already-validated result (or refuses, if it has errors) — there is no path
that partially writes the active snapshot. Applying broadcasts `data-updated`
over SSE; every open tab invalidates its TanStack Query caches and re-fetches
— charts animate to the new values with no reload (`useDataUpdatesListener`).

## Goal direction

Metrics carry a `goalDirection` field: `"higher"` (default — Sales' behavior)
or `"lower"`, for metrics where the goal is a ceiling/budget (A/R Past Due,
Defective Returns, Inventory Discrepancy, etc.). Direction drives every color
decision — attainment pill tier, WoW arrow color — via a single reflection
(`score = 200 - attainmentPct` for `"lower"` metrics) so the same tier
thresholds work for both directions. A `goalLabel` field (e.g. `"Budget"`)
swaps the header's "Goal" label without touching layout. A `goal === 0`
metric (e.g. Inventory Discrepancy, target is exactly zero) skips the percent
math entirely and shows a binary "On target" / "Off target" pill instead of a
fabricated ratio.

## Animation system

`client/src/lib/motion.js` holds one shared easing curve and stagger interval,
plus a per-department table of card-entrance and chart-draw settings:

| Department | Card entrance | Chart draw |
|---|---|---|
| Home | Fade + rise, staggered; counter rolls in from 0 on first paint | Fast (500ms) |
| Sales | Slide up + fade | 700ms |
| Inventory | Slide in from the left | 700ms, paid segment before unpaid (220ms stagger) |
| Finance | Scale-in (0.96→1), calmer/slower | 900ms + a spring-overshoot wrapper `motion.div` (Recharts has no true spring easing, so the "bars rise with overshoot" feel lives on a wrapper around an otherwise normally-animated chart) |
| Operations | Alternating slide direction per card | 600ms, series staggered 180ms apart |

Every entrance uses `whileInView` with `once: true` (no re-trigger on
scroll-up/down) and animates only `transform`/`opacity`. `usePrefersReducedMotion`
collapses every card to a plain opacity fade and sets `isAnimationActive={false}`
on every chart when the OS requests reduced motion — verified with Playwright's
`reducedMotion: 'reduce'` context option, not just by reading the code.

## How to add a department

The architecture is built so a new department needs exactly these additions —
no shared component ever needs to change:

1. **Server:** add `server/data/seed/<dept>Seed.js` (this doubles as the XLSX
   catalog, so give every metric its final `chartType`/`stackKeys`/`format`
   here), a `server/services/<dept>Service.js` (use `metricsHelpers.js`) that
   reads via `repository.getDepartmentData('<dept>')` — never `require` the
   seed module directly — and a `server/routes/<dept>.js`, then mount it in
   `server/index.js`. Add the sheet name to `DEPARTMENT_SHEETS` in
   `xlsxSchema.js` so uploads can target it.
2. **Client:** add `client/src/pages/<Dept>.jsx` (reuse `PageShell`, `KpiCard`
   with `basePath="/<dept>"` and `departmentKey="<dept>"`, a new
   `<Dept>SummaryStrip.jsx`), a matching `hooks/use<Dept>Metrics.js`, a
   `fetch<Dept>Metrics` in `services/api.js`, and two routes in `App.jsx`.
   Add a row to `CARD_VARIANTS`/`CHART_MOTION` in `lib/motion.js` if the
   department wants its own motion identity (defaults to Sales' `slideUp`).
3. **Sidebar:** flip `enabled: true` and set the `path` in
   `client/src/config/departments.js` — the Sidebar component itself never
   changes.
4. **Chart/header choice:** `KpiCard` dispatches on `metric.chartType` and on
   whether `metric.headerValues` is present. Reuse an existing chart type
   before adding a new one.
5. **Home headline (optional):** add an entry to `HEADLINE_METRIC_SLUG` and a
   `healthAttainmentPct` case in `server/services/homeService.js`, and a
   chart-type branch in `DepartmentHeadlineCard.jsx` if it's a new chart type.

## Non-negotiables (carried forward to every future phase)

- Components never hold data — everything flows through the API service layer.
- No fabricated "N/A" placeholders — missing data gets an explicit empty state
  ("No data" in tooltips) rather than a fake zero; this now also holds for
  every XLSX upload (blank cell ≠ zero cell, end to end).
- `goalDirection` must drive every color decision (pills, WoW arrows) — an
  over-budget metric must never render green.
- Clipper/trimmer/shaver/beauty product data (once introduced) is never mixed
  in an aggregation without an explicit category dimension.
- StyleCraft, GAMMA+, and Johnny B stay separable brands in the data model.
- `futureDepartment` tags on Operations metrics (Social/Klaviyo, Reviews →
  Marketing; Returns, Repair Rate → Customer Service) must be preserved so
  that migration is a data change, not a rebuild.
- An XLSX upload is validated fully before anything is written — never a
  partial apply, never a silently-accepted bad cell.

## ⚠️ Security note before wider rollout

**The `/data` upload page has no authentication.** Anyone who can reach the
app can overwrite every department's numbers and the lifetime counter. This
is acceptable only while the app is unreleased/internal-preview; before wider
rollout, lock `/api/data/*` (at minimum upload/apply/restore) behind real
auth — `server/middleware/auth.js` and `<ProtectedRoute>` are already wired
as pass-through stubs for exactly this in Phase 4.

## What's stubbed for later phases

- Authentication: `server/middleware/auth.js` and `client/src/components/layout/ProtectedRoute.jsx`
  are pass-through today; Phase 4 wires real checks into them without changing
  call sites. See the security note above.
- Customer Service, Marketing, and Manufacturing are visible in the sidebar
  and on the 360 home page with a "Coming soon" treatment.
- Metric detail drill-down (`/<dept>/:metricSlug`) is a placeholder route for
  every department.
- The counter's `POST /increment` endpoint exists but nothing calls it yet —
  real ERP/Shopify/webhook wiring is future work; today it moves via the
  demo heartbeat and the `Counter` sheet in an upload.
- Uploads are manual; scheduled/automated pulls are out of scope for now.
