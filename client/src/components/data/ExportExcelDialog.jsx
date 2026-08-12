import { useState } from "react";
import { X, Loader2, AlertTriangle, Download } from "lucide-react";
import { useDataStatus } from "../../hooks/useDataStatus";
import { rangeForPreset, snapToNearestWeekEnding } from "../../utils/datePresets";
import { CALENDAR_START, CALENDAR_END } from "../../utils/weekCalendar";
import { buildExportExcelUrl } from "../../services/api";

const RANGE_OPTIONS = [
  { value: "all", label: "All data" },
  { value: "last26weeks", label: "Last 26 weeks" },
  { value: "custom", label: "Custom range" },
];

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function resolveRange(rangeOption, anchor, customFrom, customTo) {
  if (rangeOption === "last26weeks") return rangeForPreset("last26weeks", anchor);
  if (rangeOption === "custom" && customFrom && customTo) {
    return { from: snapToNearestWeekEnding(customFrom), to: snapToNearestWeekEnding(customTo) };
  }
  return null; // "all" — the server's own default already trims to first/last real data
}

export default function ExportExcelDialog({ onClose }) {
  const { data: status } = useDataStatus();
  const [rangeOption, setRangeOption] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [state, setState] = useState("idle"); // idle | generating | error
  const [errorMessage, setErrorMessage] = useState(null);

  const lastSaveLabel = status?.active?.appliedAt
    ? new Date(status.active.appliedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "no save yet — showing sample data";

  async function handleDownload() {
    setState("generating");
    setErrorMessage(null);
    try {
      const range = resolveRange(rangeOption, status?.latestDataWeekEnding ?? null, customFrom, customTo);
      const res = await fetch(buildExportExcelUrl(range ?? {}));
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Export failed (HTTP ${res.status}).`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      downloadBlob(match ? match[1] : "StyleCraft360_Data.xlsx", blob);
      setState("idle");
      onClose?.();
    } catch (err) {
      setState("error");
      setErrorMessage(err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-heading">Download Excel</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-secondary hover:bg-surface-hover" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-ink-secondary">
          Exports all saved data + native charts, two sheets: <span className="font-medium text-ink">Graphs</span> and{" "}
          <span className="font-medium text-ink">Data</span>. Data reflects last save:{" "}
          <span className="font-medium text-ink">{lastSaveLabel}</span>.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRangeOption(opt.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                rangeOption === opt.value
                  ? "border-actual bg-actual/10 text-actual"
                  : "border-surface-border text-ink-secondary hover:bg-surface-hover"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {rangeOption === "custom" && (
          <div className="mb-4 flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              min={CALENDAR_START}
              max={CALENDAR_END}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-2.5 py-1.5 text-sm text-ink"
            />
            <span className="text-ink-muted">–</span>
            <input
              type="date"
              value={customTo}
              min={CALENDAR_START}
              max={CALENDAR_END}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-2.5 py-1.5 text-sm text-ink"
            />
          </div>
        )}

        {state === "error" && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>{errorMessage}</div>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={state === "generating" || (rangeOption === "custom" && (!customFrom || !customTo))}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-actual px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-actual-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === "generating" ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating workbook…
            </>
          ) : (
            <>
              <Download size={16} />
              {state === "error" ? "Retry download" : "Download"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
