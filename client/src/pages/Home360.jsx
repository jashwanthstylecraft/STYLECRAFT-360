import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import PageShell from "../components/layout/PageShell";
import OdometerCounter from "../components/counter/OdometerCounter";
import HomeInsightCard from "../components/home/insights/HomeInsightCard";
import HealthStrip from "../components/home/HealthStrip";
import { useCounter } from "../hooks/useCounter";
import { useHomeSummary } from "../hooks/useHomeSummary";
import { useHomeInsights } from "../hooks/useHomeInsights";
import { cardMotionProps } from "../lib/motion";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

function Hero({ total, asOf, isPlaceholder, reduceMotion }) {
  const formattedAsOf = asOf
    ? new Date(asOf).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="mb-8 rounded-2xl bg-navy px-6 py-10 text-center shadow-sm sm:px-10 sm:py-14">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-actual">Lifetime units sold</div>
      <div className="mt-3">
        {total === null ? (
          <div className="h-16 w-64 mx-auto animate-pulse rounded-lg bg-white/10 sm:h-20" />
        ) : (
          <OdometerCounter
            value={total}
            rollFromZero
            reduceMotion={reduceMotion}
            className="text-5xl font-extrabold text-white sm:text-6xl lg:text-7xl"
          />
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-300">The whole business, at a glance.</p>
      <p className="mt-1 text-xs text-slate-500">Last updated {formattedAsOf}</p>
      {isPlaceholder && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/30">
          <AlertTriangle size={12} />
          Unverified placeholder — real total not yet set
        </p>
      )}
    </div>
  );
}

export default function Home360() {
  const reduceMotion = usePrefersReducedMotion();
  const { total, asOf, isPlaceholder } = useCounter();
  const { data, isLoading, isError, error } = useHomeSummary();
  const { data: insights, isError: insightsError, error: insightsErrorObj } = useHomeInsights();

  return (
    <PageShell lastUpdated={null} showCounter={false}>
      <Hero total={total} asOf={asOf} isPlaceholder={isPlaceholder} reduceMotion={reduceMotion} />

      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={18} />
          <div>
            <div className="font-semibold">Couldn't load the department summary</div>
            <div className="text-red-600/80 dark:text-red-400/80">{error?.message ?? "The API is unreachable. Check the server is running."}</div>
          </div>
        </div>
      )}

      {!isError && data && (
        <motion.div {...cardMotionProps("fadeUp", 0, reduceMotion)} className="mb-6">
          <HealthStrip departments={data.departments} />
        </motion.div>
      )}

      {insightsError && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={18} />
          <div>
            <div className="font-semibold">Couldn't load the home insights</div>
            <div className="text-red-600/80 dark:text-red-400/80">{insightsErrorObj?.message ?? "The API is unreachable. Check the server is running."}</div>
          </div>
        </div>
      )}

      {!insightsError && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {!insights &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[320px] animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
            ))}

          {insights?.cards.map((card, index) => (
            <HomeInsightCard key={card.key} card={card} index={index} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
