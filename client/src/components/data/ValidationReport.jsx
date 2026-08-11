import { AlertCircle, AlertTriangle } from "lucide-react";

function IssueList({ items, icon: Icon, tone }) {
  if (!items.length) return null;
  const toneClasses =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400";

  return (
    <div className={`rounded-xl border p-4 ${toneClasses}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon size={16} />
        {tone === "error" ? "Errors" : "Warnings"} ({items.length})
      </div>
      <ul className="space-y-1.5 text-sm">
        {items.map((item, i) => (
          <li key={i} className="pl-1">
            {item.department && <span className="font-medium uppercase text-xs tracking-wide opacity-70">{item.department} · </span>}
            {item.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ValidationReport({ errors, warnings }) {
  if (!errors.length && !warnings.length) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-positive dark:border-green-500/30 dark:bg-green-500/10">
        No errors or warnings — this file is valid.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <IssueList items={errors} icon={AlertCircle} tone="error" />
      <IssueList items={warnings} icon={AlertTriangle} tone="warning" />
    </div>
  );
}
