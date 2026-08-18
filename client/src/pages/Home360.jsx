import { AlertTriangle } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import OdometerCounter from "../components/counter/OdometerCounter";
import { useCounter } from "../hooks/useCounter";
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

  return (
    <PageShell lastUpdated={null} showCounter={false}>
      <Hero total={total} asOf={asOf} isPlaceholder={isPlaceholder} reduceMotion={reduceMotion} />
    </PageShell>
  );
}
