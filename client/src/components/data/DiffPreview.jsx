import { formatCurrencyFull } from "../../utils/format";

function formatCell(value) {
  if (value === null || value === undefined) return "No data";
  if (typeof value === "object") return JSON.stringify(value);
  return typeof value === "number" ? formatCurrencyFull(value) : String(value);
}

const DEPARTMENT_LABELS = {
  sales: "Sales",
  inventory: "Inventory & Purchasing",
  finance: "Finance",
  operations: "Operations",
};

export default function DiffPreview({ preview }) {
  if (!preview.length) {
    return <p className="text-sm text-ink-secondary">No department sheets were found to preview.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {preview.map((entry) => (
        <div key={entry.department} className="rounded-xl border border-surface-border bg-surface-card p-4">
          <div className="text-sm font-semibold text-heading">{DEPARTMENT_LABELS[entry.department] ?? entry.department}</div>
          <div className="mt-1 text-xs text-ink-secondary">
            {entry.metricsFound} metrics · {entry.weeksFound} weeks ·{" "}
            <span className={entry.changedCount > 0 ? "font-semibold text-actual" : ""}>
              {entry.changedCount} value{entry.changedCount === 1 ? "" : "s"} changed
            </span>
          </div>
          {entry.examples.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-ink-secondary">
              {entry.examples.map((ex, i) => (
                <li key={i}>
                  <span className="font-medium">{ex.slug}</span> · {ex.week}:{" "}
                  <span className="text-ink-muted">{formatCell(ex.oldValue)}</span>
                  {" -> "}
                  <span className="font-semibold text-heading">{formatCell(ex.newValue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
