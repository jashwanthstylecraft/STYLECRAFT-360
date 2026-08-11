import { useState } from "react";
import { RotateCcw, CheckCircle2 } from "lucide-react";

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function VersionHistoryList({ versions, onRestore, isRestoring }) {
  const [restoringFile, setRestoringFile] = useState(null);

  if (!versions.length) {
    return <p className="text-sm text-ink-secondary">No uploads yet — this list fills in once you apply your first workbook.</p>;
  }

  return (
    <ul className="divide-y divide-surface-border rounded-2xl border border-surface-border bg-surface-card">
      {versions.map((version) => (
        <li key={version.file} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-heading">
              {formatTimestamp(version.appliedAt)}
              {version.active && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-positive ring-1 ring-inset ring-green-200 dark:bg-green-500/10 dark:ring-green-500/30">
                  <CheckCircle2 size={11} /> Active
                </span>
              )}
            </div>
            <div className="truncate text-xs text-ink-secondary">
              {version.filename}
              {version.note && <span> · {version.note}</span>}
            </div>
          </div>
          {!version.active && (
            <button
              onClick={() => {
                setRestoringFile(version.file);
                onRestore(version.file);
              }}
              disabled={isRestoring}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-hover disabled:opacity-50"
            >
              <RotateCcw size={13} />
              {isRestoring && restoringFile === version.file ? "Restoring…" : "Restore this version"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
