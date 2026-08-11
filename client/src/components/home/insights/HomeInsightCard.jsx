import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import CumulativeArea from "./CumulativeArea";
import TrendLine from "./TrendLine";
import ShareDonutComposition from "./ShareDonutComposition";
import LevelArea from "./LevelArea";
import MonthHeatmap from "./MonthHeatmap";
import VarianceColumns from "./VarianceColumns";
import { cardMotionProps } from "../../../lib/motion";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";

const CHART_COMPONENTS = {
  CumulativeArea,
  TrendLine,
  ShareDonutComposition,
  LevelArea,
  MonthHeatmap,
  VarianceColumns,
};

export default function HomeInsightCard({ card, index = 0 }) {
  const reduceMotion = usePrefersReducedMotion();
  const ChartComponent = CHART_COMPONENTS[card.chart];
  const linkTo = card.department && card.metricSlug ? `/${card.department}/${card.metricSlug}` : null;

  const body = (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-1 text-sm font-semibold text-heading">{card.title}</div>
      <p className="mb-3 text-xs text-ink-secondary">{card.caption}</p>
      {card.data ? (
        ChartComponent ? (
          <ChartComponent data={card.data} isAnimationActive={!reduceMotion} />
        ) : (
          <div className="text-sm text-ink-muted">Unsupported chart type "{card.chart}".</div>
        )
      ) : (
        <div className="h-[196px] animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
      )}
    </div>
  );

  return (
    <motion.div {...cardMotionProps("fadeUp", index, reduceMotion)}>
      {linkTo ? <Link to={linkTo} className="block">{body}</Link> : body}
    </motion.div>
  );
}
