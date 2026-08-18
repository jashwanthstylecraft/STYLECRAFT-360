import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize2, X, Download, ArrowUpRight, ArrowDownRight } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import MetricChart from "../components/kpi/MetricChart";
import StatsStrip from "../components/detail/StatsStrip";
import YtdComparisonBar from "../components/detail/YtdComparisonBar";
import DataTable, { buildCsvRows } from "../components/detail/DataTable";
import SampleDataBadge from "../components/data/SampleDataBadge";
import { useMetricDetail } from "../hooks/useMetricDetail";
import { useDateRangeLabel } from "../hooks/useDateRange";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { EASE, chartMotionProps, cardMotionProps } from "../lib/motion";
import { toCsv, downloadCsv } from "../utils/csv";

const DEPARTMENT_MOTION_VARIANT = {
  sales: "slideUp",
  inventory: "slideLeft",
  finance: "scaleFade",
  operations: "alternateSlideLeft",
};

const HERO_LABEL_THIN_THRESHOLD = 60;

function GoalDirectionBadge({ goalDirection }) {
  if (!goalDirection) return null;
  const isLower = goalDirection === "lower";
  const Icon = isLower ? ArrowDownRight : ArrowUpRight;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-ink-secondary ring-1 ring-inset ring-slate-200 dark:bg-white/5 dark:ring-white/10">
      <Icon size={12} />
      {isLower ? "Lower is better" : "Higher is better"}
    </span>
  );
}

// Recharts' ResponsiveContainer measures its own DOM parent, and several
// chart components wrap it in a plain (unsized) <div> alongside a legend —
// a CSS-percentage height on that chain silently resolves to 0 (blank
// chart). Measuring the sized outer box directly and handing every chart a
// real pixel number (exactly how every existing card already calls them)
// sidesteps that entirely.
function useMeasuredHeight() {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h) setHeight(Math.round(h));
    });
    observer.observe(el);
    setHeight(Math.round(el.getBoundingClientRect().height));
    return () => observer.disconnect();
  }, []);

  return [ref, height];
}

function HeroChart({ metric, weeks, departmentKey, reduceMotion, ytdBlocks }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [boxRef, boxHeight] = useMeasuredHeight();

  useEffect(() => {
    if (!fullscreen) return undefined;
    function onKey(e) {
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const chartAnim = chartMotionProps(departmentKey, reduceMotion);
  const heroProps = {
    height: boxHeight || 400,
    showBrush: true,
    labelThinThreshold: HERO_LABEL_THIN_THRESHOLD,
  };

  const chartBlock = <MetricChart metric={metric} weeks={weeks} chartAnim={chartAnim} heroProps={heroProps} />;

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-surface-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">{metric.name}</h2>
          <button
            onClick={() => setFullscreen(false)}
            className="rounded-lg border border-surface-border p-2 text-ink-secondary hover:bg-surface-hover"
            aria-label="Exit fullscreen"
          >
            <X size={18} />
          </button>
        </div>
        <div ref={boxRef} className="min-h-0 flex-1">
          {boxHeight > 0 && chartBlock}
        </div>
        {ytdBlocks && ytdBlocks.length > 0 && (
          <div className="mt-4 shrink-0">
            <YtdComparisonBar blocks={ytdBlocks} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm sm:p-6">
      <button
        onClick={() => setFullscreen(true)}
        className="absolute right-4 top-4 z-10 rounded-lg border border-surface-border bg-surface-card p-2 text-ink-secondary shadow-sm hover:bg-surface-hover"
        aria-label="View fullscreen"
        title="View fullscreen (for TV/projector display)"
      >
        <Maximize2 size={16} />
      </button>
      <div ref={boxRef} style={{ height: "60vh", minHeight: 320 }}>
        {boxHeight > 0 && chartBlock}
      </div>
    </div>
  );
}

function PrevNextArrows({ backPath, prev, next }) {
  return (
    <div className="flex items-center gap-2">
      {prev ? (
        <Link
          to={`${backPath}/${prev.slug}`}
          className="flex items-center gap-1 rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-sm text-ink-secondary shadow-sm hover:bg-surface-hover"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">{prev.name}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={`${backPath}/${next.slug}`}
          className="flex items-center gap-1 rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-sm text-ink-secondary shadow-sm hover:bg-surface-hover"
        >
          <span className="hidden sm:inline">{next.name}</span>
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

export default function MetricDetail({ backPath = "/sales", backLabel = "Sales", departmentKey = "sales" }) {
  const { metricSlug } = useParams();
  const { data, isLoading, isError, error } = useMetricDetail(departmentKey, metricSlug);
  const dateRangeLabel = useDateRangeLabel();
  const reduceMotion = usePrefersReducedMotion();
  const motionVariant = DEPARTMENT_MOTION_VARIANT[departmentKey] ?? "slideUp";

  if (isError) {
    return (
      <PageShell lastUpdated={null}>
        <Link to={backPath} className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-actual hover:underline">
          <ArrowLeft size={16} />
          Back to {backLabel}
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load this metric. {error?.message}
        </div>
      </PageShell>
    );
  }

  if (isLoading || !data) {
    return (
      <PageShell lastUpdated={null}>
        <div className="h-8 w-40 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
        <div className="mt-6 h-[60vh] min-h-[320px] animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
      </PageShell>
    );
  }

  const { hero, stats, ytd, table, isSampleData, prev, next } = data;
  const metric = hero.metric;
  const format = metric.format || "currency";
  const hasYtd = Boolean(ytd?.blocks?.length);

  function handleExportCsv() {
    const { headers, body } = buildCsvRows(metric, table, format);
    downloadCsv(`${metric.slug}.csv`, toCsv(headers, body));
  }

  const latestWeekEnding = table[0]?.weekEnding;

  return (
    <PageShell lastUpdated={null}>
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to={backPath} className="inline-flex items-center gap-1.5 text-sm font-medium text-actual hover:underline">
              <ArrowLeft size={16} />
              {backLabel}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-heading">{metric.name}</h1>
              <GoalDirectionBadge goalDirection={metric.goalDirection} />
              <SampleDataBadge isSampleData={isSampleData} />
            </div>
            <p className="mt-1 text-sm text-ink-secondary">
              {metric.description} · <span className="font-medium text-ink">{dateRangeLabel}</span>
            </p>
          </div>
          <PrevNextArrows backPath={backPath} prev={prev} next={next} />
        </div>

        <div className="mb-6 space-y-5">
          <HeroChart metric={metric} weeks={hero.weeks} departmentKey={departmentKey} reduceMotion={reduceMotion} ytdBlocks={ytd?.blocks} />
          {hasYtd && <YtdComparisonBar blocks={ytd?.blocks} />}
        </div>

        <motion.div className="mb-6" {...cardMotionProps(motionVariant, 0, reduceMotion)}>
          <StatsStrip stats={stats} goalDirection={metric.goalDirection} />
        </motion.div>

        <motion.div {...cardMotionProps(motionVariant, 1, reduceMotion)}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-secondary">Week-by-week</h2>
            <div className="flex items-center gap-3">
              <Link
                to={`/data-entry?week=${encodeURIComponent(latestWeekEnding ?? "")}`}
                className="text-sm font-medium text-actual hover:underline"
              >
                Edit this metric's data →
              </Link>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-sm font-medium text-ink-secondary shadow-sm hover:bg-surface-hover"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>
          <DataTable metric={metric} rows={table} format={format} />
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
