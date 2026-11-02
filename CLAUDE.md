# StyleCraft 360 — working rules

Internal executive dashboard. Node/Express backend + React/Vite frontend, Supabase storage, deployed on Vercel. Read this before making any code change.

## 1. Scope the blast radius before editing a shared component

This codebase has shared, multi-consumer components (chart components under `client/src/components/charts/`, services under `server/services/`, `shared/metricRegistry.mjs`). A change made for ONE metric/page can silently break every OTHER consumer of that same component.

**Rule:** before editing a shared component, grep for every place it's used/imported and mentally (or explicitly) check each consumer against the change. If a prop is being added or made conditional, check what happens for consumers that DON'T pass it.

**Rule:** when asked to update one specific thing (one metric, one page, one graph), only touch the code path for that thing. Don't "while I'm here" refactor or touch adjacent code in a shared file unless it's required to implement the request. If a shared file must change, call out in your summary to the user exactly which other consumers of that file exist and that you checked them.

This is exactly how the Inventory/Operations blank-screen bug happened: `DualMetricGroupedChart.jsx` was reworked for Promotional Sales' dual-axis need, and one element (`ReferenceLine`) was left inconsistent with the rest (missing `yAxisId`). That element only renders for metrics with a `targetLine` — which Promotional Sales doesn't have, so the person making the change never saw it break. It silently broke 3 other metrics on 2 other pages that happen to have a target line.

## 2. Recharts multi-axis rule (specific, recurring failure mode)

Any time a `ComposedChart`/multi-axis chart has more than one `YAxis` or `XAxis` with explicit `yAxisId`/`xAxisId`, **every single graphical child** that chart renders must carry a matching, explicit axis id — `Bar`, `Line`, `Area`, `ReferenceLine`, `ReferenceDot`, `ReferenceArea`, `Scatter`, everything. Recharts defaults any element missing the prop to axis id `"0"`, and if nothing registers `"0"` anymore, it throws a bare, production-unhelpful `"Invariant failed"` with no stack/detail — and with no error boundary, that crashes the whole page blank.

**Checklist whenever touching a chart component that has/gains a second axis:**
- [ ] grep the file for every `yAxisId=`/`xAxisId=` and for every element that *should* have one but doesn't
- [ ] check every conditionally-rendered element (e.g. `{targetLine !== undefined && <ReferenceLine ... />}`) — these are easy to miss because they don't render for every metric, so a broken one can pass testing on whichever metric you're actively working on
- [ ] after the change, actually load (or ask the user to load) every page/metric that uses this chart component, not just the one you were asked to change

## 3. Before shipping any change

- `npm run build` (in `client/` for frontend changes) must succeed with no new errors.
- Identify every metric/page that uses the component/service you touched (`shared/metricRegistry.mjs` tells you which metrics use which `chartType`). State in your summary to the user which ones you verified.
- `git fetch origin` + `git log --oneline main..origin/main` before committing, to catch divergence.
- After `vercel --prod --yes`, confirm with `vercel inspect <url> --wait` that the deployment reached Ready before telling the user it's done.

## 4. Error boundary exists — don't rely on it as a substitute for correctness

`client/src/components/layout/PageShell.jsx` wraps page content in `PageErrorBoundary` (`client/src/components/layout/PageErrorBoundary.jsx`), so a future render crash shows a readable message instead of a blank screen. This is a safety net for the user, not a reason to skip checking other consumers of a shared component before shipping — catching the crash still means that page is down until someone notices and fixes it.

## 5. Data-entry / sheet-sync tasks

Temporary one-off scripts for pulling data from Google Sheets or writing data via `entryService.saveWeek()` go in `server/scripts/_tmp-*.js` and must be deleted after use — don't leave them in the repo. Never read `.env` contents directly (no `cat`/`grep` on it); load it into `process.env` via a small loader script instead.
