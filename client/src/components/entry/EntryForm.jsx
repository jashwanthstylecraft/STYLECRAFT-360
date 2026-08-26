import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { formatValue } from "../../utils/format";

const DEPARTMENT_LABELS = {
  sales: "Sales",
  operations: "Operations",
  inventory: "Inventory & Purchasing",
  finance: "Finance",
  marketing: "Marketing",
  "customer-service": "Customer Service",
};
const DEPARTMENT_ORDER = ["sales", "operations", "inventory", "finance", "marketing", "customer-service"];

function toEditableString(value, format) {
  if (value === null || value === undefined) return "";
  if (format === "percent") return String(Math.round(value * 10000) / 100);
  return String(value);
}

function priorHint(priorValue, format) {
  if (priorValue === null || priorValue === undefined) return undefined;
  return `prior: ${formatValue(priorValue, format)}`;
}

function FieldInput({ value, onChange, placeholder, error }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg border bg-surface px-2.5 py-1.5 text-sm text-ink focus:outline-none ${
        error ? "border-negative focus:border-negative" : "border-surface-border focus:border-actual"
      }`}
    />
  );
}

function MetricRow({ metric, edits, onEdit, fieldErrors }) {
  const initialValue = toEditableString(metric.value, metric.format);
  const initialGoal = toEditableString(metric.goal, metric.format);

  if (metric.isMulti) {
    return (
      <div className="grid grid-cols-[1fr_140px_140px_140px] items-start gap-3 border-b border-surface-border/60 py-3 last:border-0">
        <div>
          <div className="text-sm font-medium text-ink">{metric.name}</div>
          {metric.description && <div className="mt-0.5 text-xs text-ink-muted">{metric.description}</div>}
        </div>
        {metric.subRows.map((sub) => (
          <div key={sub.key}>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{sub.label}</div>
            <FieldInput
              value={edits[sub.entryKey]?.value ?? toEditableString(sub.value, metric.format)}
              onChange={(v) => onEdit(sub.entryKey, "value", v)}
              placeholder={priorHint(sub.priorValue, metric.format)}
              error={fieldErrors[sub.entryKey]?.value}
            />
          </div>
        ))}
        {metric.hasGoal && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{metric.goalLabel}</div>
            <FieldInput
              value={edits[metric.goalEntryKey]?.goal ?? initialGoal}
              onChange={(v) => onEdit(metric.goalEntryKey, "goal", v)}
              placeholder={priorHint(metric.priorGoal, metric.format)}
              error={fieldErrors[metric.goalEntryKey]?.goal}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_140px_140px] items-start gap-3 border-b border-surface-border/60 py-3 last:border-0">
      <div>
        <div className="text-sm font-medium text-ink">{metric.name}</div>
        {metric.description && <div className="mt-0.5 text-xs text-ink-muted">{metric.description}</div>}
      </div>
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Value</div>
        <FieldInput
          value={edits[metric.entryKey]?.value ?? initialValue}
          onChange={(v) => onEdit(metric.entryKey, "value", v)}
          placeholder={priorHint(metric.priorValue, metric.format)}
          error={fieldErrors[metric.entryKey]?.value}
        />
      </div>
      {metric.hasGoal ? (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{metric.goalLabel}</div>
          <FieldInput
            value={edits[metric.goalEntryKey]?.goal ?? initialGoal}
            onChange={(v) => onEdit(metric.goalEntryKey, "goal", v)}
            placeholder={priorHint(metric.priorGoal, metric.format)}
            error={fieldErrors[metric.goalEntryKey]?.goal}
          />
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}

export default function EntryForm({ entryData, onSave, isSaving }) {
  const [edits, setEdits] = useState({});
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState([]);
  const [successAt, setSuccessAt] = useState(null);

  function handleEdit(entryKey, field, rawValue) {
    setEdits((prev) => ({ ...prev, [entryKey]: { ...prev[entryKey], [field]: rawValue } }));
    setSuccessAt(null);
  }

  const fieldErrors = {};
  for (const err of errors) {
    if (!err.entryKey) continue;
    fieldErrors[err.entryKey] = { ...fieldErrors[err.entryKey], [err.field ?? "value"]: err.message };
  }

  async function handleSave() {
    setErrors([]);
    const hasEdits = Object.keys(edits).length > 0;
    if (!hasEdits) return;
    const result = await onSave(edits, note);
    if (result.ok) {
      setEdits({});
      setNote("");
      setSuccessAt(Date.now());
    } else {
      setErrors(result.errors ?? []);
    }
  }

  const hasEdits = Object.keys(edits).length > 0;
  const generalErrors = errors.filter((e) => !e.entryKey);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
      <div className="flex items-center justify-between border-b border-surface-border px-5 py-3">
        <div>
          <div className="text-sm font-semibold text-heading">{entryData.weekLabel}</div>
          <div className="text-xs text-ink-muted">
            {entryData.isFuture ? "Upcoming week" : "Week ending"} · {entryData.weekEnding}
          </div>
        </div>
        {entryData.isFuture && (
          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            Future week
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {DEPARTMENT_ORDER.map((deptKey) => {
          const dept = entryData.departments.find((d) => d.key === deptKey);
          if (!dept) return null;
          return (
            <div key={deptKey} className="mb-6">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{DEPARTMENT_LABELS[deptKey]}</h3>
              <div>
                {dept.metrics.map((metric) => (
                  <MetricRow key={metric.slug} metric={metric} edits={edits} onEdit={handleEdit} fieldErrors={fieldErrors} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-surface-border px-5 py-4">
        {generalErrors.length > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>{generalErrors.map((e) => e.message).join(" ")}</div>
          </div>
        )}
        {Object.keys(fieldErrors).length > 0 && (
          <div className="mb-3 text-xs text-negative">Fix the highlighted fields above before saving.</div>
        )}
        {successAt && (
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-positive">
            <Check size={16} />
            Saved.
          </div>
        )}
        <div className="mb-3">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink focus:border-actual focus:outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!hasEdits || isSaving}
          className="rounded-lg bg-actual px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-actual-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? "Saving…" : hasEdits ? "Save changes" : "No changes"}
        </button>
      </div>
    </div>
  );
}
