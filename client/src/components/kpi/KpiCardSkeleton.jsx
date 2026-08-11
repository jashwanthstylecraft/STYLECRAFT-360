export default function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm">
      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-3 flex items-end gap-5">
        <div className="h-7 w-20 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-5 w-16 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
      </div>
      <div className="mt-3 h-5 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 h-[196px] animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
    </div>
  );
}
