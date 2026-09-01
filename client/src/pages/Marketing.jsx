import { AlertTriangle, Clock } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import KpiCard from "../components/kpi/KpiCard";
import KpiCardSkeleton from "../components/kpi/KpiCardSkeleton";
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
          Reserved for future metrics · <span className="font-medium text-ink">{dateRangeLabel}</span>
        </p>
      </div>
      <SampleDataBadge isSampleData={isSampleData} />
    </div>
  );
}

function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-surface-border bg-surface-card px-6 py-16 text-center">
      <Clock size={28} className="text-ink-muted" />
      <div className="text-sm font-semibold text-heading">No metrics here yet</div>
      <div className="max-w-sm text-sm text-ink-secondary">
        This department is reserved for future use — its metrics will show up here once they're added.
      </div>
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

      {!isError && !isLoading && data?.metrics.length === 0 && <ComingSoon />}

      {!isError && (isLoading || data?.metrics.length > 0) && (
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
      )}
    </PageShell>
  );
}
