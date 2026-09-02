import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MetricSummaryHeader from "./MetricSummaryHeader";
import MetricChart from "./MetricChart";
import { cardMotionProps, chartMotionProps } from "../../lib/motion";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

export default function KpiCard({ metric, weeks, basePath = "/sales", departmentKey = "sales", motionVariant = "slideUp", index = 0 }) {
  const reduceMotion = usePrefersReducedMotion();

  const chartAnim = chartMotionProps(departmentKey, reduceMotion);
  // Finance's "bars rise with a slight overshoot spring" — Recharts' own
  // easing set has no true spring, so the overshoot lives on a wrapper
  // motion.div (a real spring) around an otherwise normally-animated chart.
  const useOvershootWrapper = departmentKey === "finance" && !reduceMotion;

  const chart = <MetricChart metric={metric} weeks={weeks} chartAnim={chartAnim} />;

  return (
    <motion.div className="h-full" {...cardMotionProps(motionVariant, index, reduceMotion)}>
      <Link
        to={`${basePath}/${metric.slug}`}
        className="block h-full rounded-none border-2 border-black bg-surface-card p-5 shadow-sm transition-shadow hover:shadow-md dark:rounded-2xl dark:border dark:border-surface-border"
      >
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
      </Link>
    </motion.div>
  );
}
