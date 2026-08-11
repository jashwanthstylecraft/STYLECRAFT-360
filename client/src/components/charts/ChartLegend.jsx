// Legends mirror the mark they key: a rect swatch for bars/areas, a short
// line stroke for line series. Only rendered charts with 2+ series need this.
export default function ChartLegend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[11px] font-medium text-ink-secondary">
          <span
            className="inline-block"
            style={
              item.shape === "line"
                ? { width: 12, height: 2, backgroundColor: item.color }
                : item.shape === "dashed-rect"
                ? {
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: item.fill ?? "transparent",
                    border: `1.5px dashed ${item.color}`,
                    boxSizing: "border-box",
                  }
                : { width: 8, height: 8, borderRadius: 2, backgroundColor: item.color }
            }
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
