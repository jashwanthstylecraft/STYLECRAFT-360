import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MetricSummaryHeader from "./MetricSummaryHeader";
import MetricChart from "./MetricChart";
import YtdCardBack from "./YtdCardBack";
import { cardMotionProps, chartMotionProps } from "../../lib/motion";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

const CARD_FACE_CLASSES =
  "h-full rounded-none border-2 border-black bg-surface-card p-5 shadow-sm dark:rounded-2xl dark:border dark:border-surface-border";

export default function KpiCard({ metric, weeks, basePath = "/sales", departmentKey = "sales", motionVariant = "slideUp", index = 0 }) {
  const reduceMotion = usePrefersReducedMotion();

  const chartAnim = chartMotionProps(departmentKey, reduceMotion);
  // Finance's "bars rise with a slight overshoot spring" — Recharts' own
  // easing set has no true spring, so the overshoot lives on a wrapper
  // motion.div (a real spring) around an otherwise normally-animated chart.
  const useOvershootWrapper = departmentKey === "finance" && !reduceMotion;
  // Hover-to-flip only applies when there's real Year-to-Date and/or Rate
  // of Change data to show on the back — a metric with neither (see
  // buildYtdStats/buildRocStats on the server) keeps the card exactly as
  // it was, no flip, nothing on hover. A snapshot metric like Inventory
  // Level has no YTD but does have ROC, and still gets a flip for that.
  const hasYtd = Boolean(metric.ytd?.blocks?.length);
  const hasRoc = Boolean(metric.roc?.blocks?.length);
  const hasFlipBack = hasYtd || hasRoc;

  const chart = <MetricChart metric={metric} weeks={weeks} chartAnim={chartAnim} />;

  const front = (
    <div className={`${CARD_FACE_CLASSES} ${hasFlipBack ? "[backface-visibility:hidden]" : "transition-shadow hover:shadow-md"}`}>
      <MetricSummaryHeader metric={metric} />

      {useOvershootWrapper ? (
        <motion.div
          className="mt-3"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ type: "spring", bounce: 0.35, duration: 0.8, delay: 0.1 }}
        >
          {chart}
        </motion.div>
      ) : (
        <div className="mt-3">{chart}</div>
      )}
    </div>
  );

  return (
    <motion.div className="h-full" {...cardMotionProps(motionVariant, index, reduceMotion)}>
      <Link to={`${basePath}/${metric.slug}`} className={`group block h-full ${hasFlipBack ? "[perspective:1200px]" : ""}`}>
        {hasFlipBack ? (
          <div
            className={`relative h-full [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] ${
              reduceMotion ? "" : "transition-transform duration-700"
            }`}
          >
            {front}
            <div className={`${CARD_FACE_CLASSES} absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]`}>
              <YtdCardBack ytdBlocks={metric.ytd?.blocks} rocBlocks={metric.roc?.blocks} goalDirection={metric.goalDirection} />
            </div>
          </div>
        ) : (
          front
        )}
      </Link>
    </motion.div>
  );
}
