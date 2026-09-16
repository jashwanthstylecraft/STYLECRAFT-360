import { useState } from "react";
import { AlertTriangle, Check, StickyNote, CalendarRange } from "lucide-react";
import { formatValue } from "../../utils/format";

const GOAL_RANGE_PRESETS = [
  { label: "3 months", weeks: 13 },
  { label: "6 months", weeks: 26 },
  { label: "12 months", weeks: 52 },
];

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

// A small toggle rather than a text box on every one of the ~25 rows per
// department — most weeks most metrics have nothing to say. Lit up (filled)
// whenever this metric already has a saved note or one's being drafted, so
// existing commentary is never hidden behind an unlit icon.
function NoteToggleButton({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${
        active ? "bg-actual/10 text-actual" : "text-ink-muted hover:bg-surface-hover hover:text-ink-secondary"
      }`}
      title="Note for this graph this week"
      aria-label="Toggle note for this graph this week"
    >
      <StickyNote size={14} />
    </button>
  );
}

function NoteField({ metric, edits, onEdit }) {
  const initialNote = metric.note ?? "";
  return (
    <div className="mt-2">
      <input
        type="text"
        value={edits[metric.noteEntryKey]?.note ?? initialNote}
        onChange={(e) => onEdit(metric.noteEntryKey, "note", e.target.value)}
        placeholder={metric.priorNote ? `prior: ${metric.priorNote}` : "Note for this graph this week (optional)"}
        className="w-full rounded-lg border border-surface-border bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-actual focus:outline-none"
      />
    </div>
  );
}

// Small icon button next to a metric's Goal field — opens GoalRangePanel to
// set that same goal value across many weeks in one action, instead of
// typing it into each week's Data Entry one at a time.
function GoalRangeButton({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${
        active ? "bg-actual/10 text-actual" : "text-ink-muted hover:bg-surface-hover hover:text-ink-secondary"
      }`}
      title="Set this goal across many weeks at once"
      aria-label="Set goal for a range of weeks"
    >
      <CalendarRange size={14} />
    </button>
  );
}

// Applies immediately via its own request (onApply) rather than joining the
// page's staged edits/Save flow — a range can span far beyond the single
// week Data Entry is currently showing, so it doesn't fit that model.
// Additive only: weeks that already have a goal are skipped, never
// overwritten (see setGoalRange in entryService.js).
function GoalRangePanel({ metric, startWeekEnding, onApply, onClose }) {
  const [value, setValue] = useState(() => toEditableString(metric.goal, metric.format));
  const [weeks, setWeeks] = useState(26);
  const [customWeeks, setCustomWeeks] = useState("");
  const [status, setStatus] = useState(null);
  const [applying, setApplying] = useState(false);

  const effectiveWeeks = customWeeks ? Number(customWeeks) : weeks;
  const canApply = value.trim() !== "" && effectiveWeeks > 0 && !applying;

  async function handleApply() {
    setApplying(true);
    setStatus(null);
    const result = await onApply({ slug: metric.slug, startWeekEnding, weekCount: effectiveWeeks, value });
    setApplying(false);
    setStatus(result);
  }

  return (
    <div className="mt-2 rounded-lg border border-surface-border bg-surface p-3">
      <div className="mb-2 text-xs font-semibold text-ink-secondary">
        Set {metric.goalLabel} for {effectiveWeeks || "…"} week{effectiveWeeks === 1 ? "" : "s"}, starting {startWeekEnding}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <div className="mb-1 text-[11px] text-ink-muted">Value</div>
          <FieldInput value={value} onChange={setValue} />
        </div>
        <div className="flex gap-1">
          {GOAL_RANGE_PRESETS.map((p) => (
            <button
              key={p.weeks}
              type="button"
              onClick={() => {
                setWeeks(p.weeks);
                setCustomWeeks("");
              }}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                !customWeeks && weeks === p.weeks
                  ? "border-actual bg-actual/10 text-actual"
                  : "border-surface-border text-ink-secondary hover:bg-surface-hover"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div>
          <div className="mb-1 text-[11px] text-ink-muted">Custom (weeks)</div>
          <input
            type="text"
            inputMode="numeric"
            value={customWeeks}
            onChange={(e) => setCustomWeeks(e.target.value.replace(/\D/g, ""))}
            placeholder={String(weeks)}
            className="w-20 rounded-lg border border-surface-border bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-actual focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={!canApply}
          className="rounded-lg bg-actual px-3 py-1.5 text-xs font-semibold text-white hover:bg-actual-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          {applying ? "Applying…" : "Apply"}
        </button>
        <button type="button" onClick={onClose} className="text-xs font-medium text-ink-muted hover:text-ink-secondary">
          Close
        </button>
      </div>
      {status?.ok && (
        <div className="mt-2 text-xs text-positive">
          Set {status.filled.length} week{status.filled.length === 1 ? "" : "s"}.
          {status.skipped.length > 0 && ` Skipped ${status.skipped.length} that already had a goal.`}
          {status.beyondCalendar > 0 && ` ${status.beyondCalendar} week(s) ran past the calendar's end and weren't set.`}
        </div>
      )}
      {status && !status.ok && <div className="mt-2 text-xs text-negative">{status.errors?.[0]?.message ?? "Couldn't apply."}</div>}
    </div>
  );
}

function MetricRow({ metric, edits, onEdit, fieldErrors, noteExpanded, onToggleNote, startWeekEnding, onSetGoalRange }) {
  const initialValue = toEditableString(metric.value, metric.format);
  const initialGoal = toEditableString(metric.goal, metric.format);
  const hasNoteContent = Boolean(edits[metric.noteEntryKey]?.note ?? metric.note);
  const showNote = noteExpanded || hasNoteContent;
  const [showGoalRange, setShowGoalRange] = useState(false);

  if (metric.isMulti) {
    return (
      <div className="border-b border-surface-border/60 py-3 last:border-0">
        <div className="grid grid-cols-[1fr_140px_140px_140px_auto] items-start gap-3">
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
          <div className="flex items-center gap-1 pt-5">
            {metric.hasGoal && <GoalRangeButton active={showGoalRange} onClick={() => setShowGoalRange((v) => !v)} />}
            <NoteToggleButton active={showNote} onClick={() => onToggleNote(metric.slug)} />
          </div>
        </div>
        {showGoalRange && (
          <GoalRangePanel metric={metric} startWeekEnding={startWeekEnding} onApply={onSetGoalRange} onClose={() => setShowGoalRange(false)} />
        )}
        {showNote && <NoteField metric={metric} edits={edits} onEdit={onEdit} />}
      </div>
    );
  }

  return (
    <div className="border-b border-surface-border/60 py-3 last:border-0">
      <div className="grid grid-cols-[1fr_140px_140px_auto] items-start gap-3">
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
        <div className="flex items-center gap-1 pt-5">
          {metric.hasGoal && <GoalRangeButton active={showGoalRange} onClick={() => setShowGoalRange((v) => !v)} />}
          <NoteToggleButton active={showNote} onClick={() => onToggleNote(metric.slug)} />
        </div>
      </div>
      {showGoalRange && (
        <GoalRangePanel metric={metric} startWeekEnding={startWeekEnding} onApply={onSetGoalRange} onClose={() => setShowGoalRange(false)} />
      )}
      {showNote && <NoteField metric={metric} edits={edits} onEdit={onEdit} />}
    </div>
  );
}

export default function EntryForm({ entryData, onSave, onSetGoalRange, isSaving }) {
  const [edits, setEdits] = useState({});
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState([]);
  const [successAt, setSuccessAt] = useState(null);
  const [expandedNoteSlugs, setExpandedNoteSlugs] = useState(() => new Set());

  function handleEdit(entryKey, field, rawValue) {
    setEdits((prev) => ({ ...prev, [entryKey]: { ...prev[entryKey], [field]: rawValue } }));
    setSuccessAt(null);
  }

  function toggleNote(slug) {
    setExpandedNoteSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
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
                  <MetricRow
                    key={metric.slug}
                    metric={metric}
                    edits={edits}
                    onEdit={handleEdit}
                    fieldErrors={fieldErrors}
                    noteExpanded={expandedNoteSlugs.has(metric.slug)}
                    onToggleNote={toggleNote}
                    startWeekEnding={entryData.weekEnding}
                    onSetGoalRange={onSetGoalRange}
                  />
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
