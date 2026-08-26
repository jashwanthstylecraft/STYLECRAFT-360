import { AlertTriangle } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import KpiCard from "../components/kpi/KpiCard";
import KpiCardSkeleton from "../components/kpi/KpiCardSkeleton";
import MarketingSummaryStrip from "../components/dashboard/MarketingSummaryStrip";
import SampleDataBadge from "../components/data/SampleDataBadge";
import { useMarketingMetrics } from "../hooks/useMarketingMetrics";
import { useDateRangeLabel } from "../hooks/useDateRange";

const BASE_PATH = "/marketing";

function PageHeader({ dateRangeLabel, isSampleData }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div>
        <h1 className="text-2xl font-bold text-heading">Marketing</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Social growth and product reviews · <span className="font-medium text-ink">{dateRangeLabel}</span>
        </p>
      </div>
      <SampleDataBadge isSampleData={isSampleData} />
    </div>
  );
}

export default function Marketing() {
  const { data, isLoading, isError, error } = useMarketingMetrics();
  const dateRangeLabel = useDateRangeLabel();

  return (
    <PageShell lastUpdated={data?.asOf} scrollKey="marketing">
      <PageHeader dateRangeLabel={dateRangeLabel} isSampleData={data?.isSampleData} />

      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={18} />
          <div>
            <div className="font-semibold">Couldn't load marketing data</div>
            <div className="text-red-600/80 dark:text-red-400/80">{error?.message ?? "The API is unreachable. Check the server is running."}</div>
          </div>
        </div>
      )}

      {!isError && (
        <>
          <div className="mb-6">
            {data ? (
              <MarketingSummaryStrip summary={data.summary} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {isLoading && Array.from({ length: 2 }).map((_, i) => <KpiCardSkeleton key={i} />)}

            {data?.metrics.map((metric, index) => (
              <KpiCard
                key={metric.slug}
                metric={metric}
                weeks={data.weeks}
                basePath={BASE_PATH}
                departmentKey="marketing"
                motionVariant="fadeUp"
                index={index}
              />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
