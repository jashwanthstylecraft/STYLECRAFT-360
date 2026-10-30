import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeft, ArrowUpDown, Search } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import { fetchUnitsBySku } from "../services/api";
import { formatCount } from "../utils/format";

const ROW_HEIGHT = 40;

function SortButton({ label, active, direction, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 ${active ? "text-heading" : "text-ink-secondary hover:text-ink"}`}
    >
      {label}
      <ArrowUpDown size={12} className={active ? "opacity-100" : "opacity-40"} />
      {active && <span className="sr-only">({direction === "desc" ? "descending" : "ascending"})</span>}
    </button>
  );
}

export default function UnitsSoldBySku() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ["units-by-sku"], queryFn: fetchUnitsBySku });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "qty", direction: "desc" });
  const scrollRef = useRef(null);

  const rows = useMemo(() => {
    const all = data?.skus ?? [];
    const filtered = search.trim()
      ? all.filter((r) => r.sku.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()))
      : all;
    const sorted = [...filtered].sort((a, b) => {
      const dir = sort.direction === "desc" ? -1 : 1;
      if (sort.key === "qty") return (a.qty - b.qty) * dir;
      return a[sort.key].localeCompare(b[sort.key]) * dir;
    });
    return sorted;
  }, [data, search, sort]);

  function toggleSort(key) {
    setSort((prev) => (prev.key === key ? { key, direction: prev.direction === "desc" ? "asc" : "desc" } : { key, direction: "desc" }));
  }

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const formattedAsOf = data?.asOf
    ? new Date(data.asOf).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

  return (
    <PageShell lastUpdated={null}>
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-actual hover:underline">
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Lifetime Units Sold — by SKU</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Synced every Saturday from the all-time invoiced-quantity sheet · Last synced {formattedAsOf}
          </p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-surface-card px-5 py-3 text-right shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Grand Total</div>
          <div className="text-2xl font-bold tabular-nums text-heading">
            {data?.grandTotal === null || data?.grandTotal === undefined ? "—" : formatCount(Math.round(data.grandTotal))}
          </div>
        </div>
      </div>

      {isError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load units by SKU. {error?.message}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or description…"
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 pl-8 text-sm text-ink focus:border-actual focus:outline-none"
          />
        </div>
        <div className="text-xs text-ink-muted">
          {isLoading ? "Loading…" : `${rows.length.toLocaleString("en-US")} of ${(data?.skus ?? []).length.toLocaleString("en-US")} SKUs`}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-sm">
        <div className="grid grid-cols-[1fr_2fr_140px] gap-3 border-b border-surface-border bg-surface-hover/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
          <SortButton label="SKU" active={sort.key === "sku"} direction={sort.direction} onClick={() => toggleSort("sku")} />
          <SortButton label="Description" active={sort.key === "description"} direction={sort.direction} onClick={() => toggleSort("description")} />
          <div className="text-right">
            <SortButton label="Qty Invoiced" active={sort.key === "qty"} direction={sort.direction} onClick={() => toggleSort("qty")} />
          </div>
        </div>

        <div ref={scrollRef} className="max-h-[65vh] min-h-[320px] overflow-y-auto">
          {!isLoading && rows.length === 0 && <div className="p-6 text-center text-sm text-ink-muted">No SKUs match "{search}".</div>}
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];
              return (
                <div
                  key={row.sku}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${vi.start}px)`, height: ROW_HEIGHT }}
                  className="grid grid-cols-[1fr_2fr_140px] items-center gap-3 border-b border-surface-border/60 px-4 text-sm"
                >
                  <span className="truncate font-medium text-ink">{row.sku}</span>
                  <span className="truncate text-ink-secondary">{row.description}</span>
                  <span className="text-right tabular-nums text-ink">{formatCount(row.qty)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
