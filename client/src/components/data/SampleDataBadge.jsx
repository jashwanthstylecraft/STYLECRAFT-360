import { FlaskConical } from "lucide-react";

// Shown on every department page header until a real upload is active, and
// again if all uploads are later cleared — never hides just because data
// happens to look plausible.
export default function SampleDataBadge({ isSampleData }) {
  if (!isSampleData) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30">
      <FlaskConical size={12} />
      Sample data
    </span>
  );
}
