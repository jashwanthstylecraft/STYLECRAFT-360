import { AlertTriangle } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import KpiCard from "../components/kpi/KpiCard";
import KpiCardSkeleton from "../components/kpi/KpiCardSkeleton";
import SampleDataBadge from "../components/data/SampleDataBadge";
import { useFinanceMetrics } from "../hooks/useFinanceMetrics";
import { useDateRangeLabel } from "../hooks/useDateRange";

const BASE_PATH = "/finance";

function PageHeader({ dateRangeLabel, isSampleData }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div>
        <h1 className="text-2xl font-bold text-heading">Finance</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Receivables and margin · <span className="font-medium text-ink">{dateRangeLabel}</span>
        </p>
      </div>
      <SampleDataBadge isSampleData={isSampleData} />
    </div>
  );
}

export default function Finance() {
  const { data, isLoading, isError, error } = useFinanceMetrics();
  const dateRangeLabel = useDateRangeLabel();

  return (
    <PageShell lastUpdated={data?.asOf} scrollKey="finance">
      <PageHeader dateRangeLabel={dateRangeLabel} isSampleData={data?.isSampleData} />

      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={18} />
          <div>
            <div className="font-semibold">Couldn't load finance data</div>
            <div className="text-red-600/80 dark:text-red-400/80">{error?.message ?? "The API is unreachable. Check the server is running."}</div>
          </div>
        </div>
      )}

      {!isError && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading && Array.from({ length: 3 }).map((_, i) => <KpiCardSkeleton key={i} />)}

            {data?.metrics.map((metric, index) => (
              <KpiCard
                key={metric.slug}
                metric={metric}
                weeks={data.weeks}
                basePath={BASE_PATH}
                departmentKey="finance"
                motionVariant="scaleFade"
                index={index}
              />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
