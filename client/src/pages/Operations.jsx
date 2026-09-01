import { AlertTriangle } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import KpiCard from "../components/kpi/KpiCard";
import KpiCardSkeleton from "../components/kpi/KpiCardSkeleton";
import SampleDataBadge from "../components/data/SampleDataBadge";
import { useOperationsMetrics } from "../hooks/useOperationsMetrics";
import { useDateRangeLabel } from "../hooks/useDateRange";
import { alternateSlideVariant } from "../lib/motion";

const BASE_PATH = "/operations";

function PageHeader({ dateRangeLabel, isSampleData }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div>
        <h1 className="text-2xl font-bold text-heading">Operations</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Fulfillment, quality, service and engagement · <span className="font-medium text-ink">{dateRangeLabel}</span>
        </p>
      </div>
      <SampleDataBadge isSampleData={isSampleData} />
    </div>
  );
}

export default function Operations() {
  const { data, isLoading, isError, error } = useOperationsMetrics();
  const dateRangeLabel = useDateRangeLabel();

  return (
    <PageShell lastUpdated={data?.asOf} scrollKey="operations">
      <PageHeader dateRangeLabel={dateRangeLabel} isSampleData={data?.isSampleData} />

      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={18} />
          <div>
            <div className="font-semibold">Couldn't load operations data</div>
            <div className="text-red-600/80 dark:text-red-400/80">{error?.message ?? "The API is unreachable. Check the server is running."}</div>
          </div>
        </div>
      )}

      {!isError && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {isLoading && Array.from({ length: 10 }).map((_, i) => <KpiCardSkeleton key={i} />)}

            {data?.metrics.map((metric, index) => (
              <KpiCard
                key={metric.slug}
                metric={metric}
                weeks={data.weeks}
                basePath={BASE_PATH}
                departmentKey="operations"
                motionVariant={alternateSlideVariant(index)}
                index={index}
              />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
