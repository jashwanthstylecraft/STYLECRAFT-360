import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import WeekList from "../components/entry/WeekList";
import EntryForm from "../components/entry/EntryForm";
import ExportExcelDialog from "../components/data/ExportExcelDialog";
import { useEntryData, useEntryCoverage, useSaveEntryWeek } from "../hooks/useEntryData";

export default function DataEntry() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedWeek = searchParams.get("week") || undefined;
  const [showExportDialog, setShowExportDialog] = useState(false);

  const { data: coverage, isLoading: coverageLoading } = useEntryCoverage();
  const { data: entryData, isLoading: entryLoading, isError, error } = useEntryData(requestedWeek);
  const saveMutation = useSaveEntryWeek();

  function selectWeek(weekEnding) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("week", weekEnding);
      return next;
    });
  }

  async function handleSave(entries, note) {
    try {
      await saveMutation.mutateAsync({ weekEnding: entryData.weekEnding, entries, note });
      return { ok: true };
    } catch (err) {
      return { ok: false, errors: err.errors ?? [{ message: err.message }] };
    }
  }

  return (
    <PageShell lastUpdated={null}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Data Entry</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Click any week in the master calendar (2022–2027) to view or edit its numbers.
          </p>
        </div>
        <button
          onClick={() => setShowExportDialog(true)}
          className="flex flex-col items-start rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-left shadow-sm hover:bg-surface-hover"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium text-heading">
            <FileSpreadsheet size={15} />
            Download Excel
          </span>
          <span className="text-xs text-ink-muted">Exports all saved data + charts</span>
        </button>
      </div>

      {showExportDialog && <ExportExcelDialog onClose={() => setShowExportDialog(false)} />}

      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={18} />
          <div>
            <div className="font-semibold">Couldn't load entry data</div>
            <div className="text-red-600/80 dark:text-red-400/80">{error?.message}</div>
          </div>
        </div>
      )}

      <div className="grid h-[calc(100vh-220px)] min-h-[480px] grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <div className="hidden h-full min-h-0 lg:block">
          {!coverageLoading && coverage && (
            <WeekList
              weeks={coverage.weeks}
              totalMetrics={coverage.totalMetrics}
              currentWeekEnding={coverage.currentWeekEnding}
              selectedWeekEnding={entryData?.weekEnding}
              onSelectWeek={selectWeek}
            />
          )}
        </div>

        <div className="h-full min-h-0">
          {entryData && !entryLoading && (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="flex items-center gap-2 lg:hidden">
                <button
                  onClick={() => entryData.priorWeekEnding && selectWeek(entryData.priorWeekEnding)}
                  disabled={!entryData.priorWeekEnding}
                  className="rounded-lg border border-surface-border p-2 text-ink-secondary disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex-1 text-center text-sm font-medium text-ink">{entryData.weekLabel}</div>
                <button
                  onClick={() => entryData.nextWeekEnding && selectWeek(entryData.nextWeekEnding)}
                  disabled={!entryData.nextWeekEnding}
                  className="rounded-lg border border-surface-border p-2 text-ink-secondary disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <EntryForm key={entryData.weekEnding} entryData={entryData} onSave={handleSave} isSaving={saveMutation.isPending} />
            </div>
          )}
          {(entryLoading || !entryData) && !isError && (
            <div className="flex h-full items-center justify-center rounded-2xl border border-surface-border bg-surface-card text-sm text-ink-muted">
              Loading…
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
