import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Check, ChevronDown, Menu, Sun, Moon } from "lucide-react";
import CompactCounter from "../counter/CompactCounter";
import { useTheme } from "../../contexts/ThemeContext";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { animateThemeToggle } from "../../utils/viewTransitionTheme";
import { useDateRange, useDateRangeLabel } from "../../hooks/useDateRange";
import { PRESETS, snapToNearestWeekEnding } from "../../utils/datePresets";
import { CALENDAR_START, CALENDAR_END } from "../../utils/weekCalendar";

function CustomRangeFields({ onApply }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const canApply = from && to && from <= to;

  return (
    <div className="border-t border-surface-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          type="date"
          value={from}
          min={CALENDAR_START}
          max={CALENDAR_END}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full rounded-md border border-surface-border bg-surface px-2 py-1.5 text-xs text-ink"
        />
        <span className="text-ink-muted">–</span>
        <input
          type="date"
          value={to}
          min={CALENDAR_START}
          max={CALENDAR_END}
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-md border border-surface-border bg-surface px-2 py-1.5 text-xs text-ink"
        />
      </div>
      <button
        onClick={() => canApply && onApply(snapToNearestWeekEnding(from), snapToNearestWeekEnding(to))}
        disabled={!canApply}
        className="w-full rounded-md bg-actual px-2 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Apply
      </button>
    </div>
  );
}

function DateRangeSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { preset, setPreset } = useDateRange();
  const label = useDateRangeLabel();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Date range"
        className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-ink-secondary shadow-sm hover:bg-surface-hover"
      >
        <Calendar size={16} className="text-ink-muted" />
        {label}
        <ChevronDown size={14} className="text-ink-muted" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border border-surface-border bg-surface-card shadow-lg">
          {PRESETS.filter((p) => p.value !== "custom").map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setPreset(p.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink-secondary hover:bg-surface-hover"
            >
              <span>{p.label}</span>
              {p.value === preset && <Check size={14} className="text-actual" />}
            </button>
          ))}
          <CustomRangeFields
            onApply={(from, to) => {
              setPreset("custom", { from, to });
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const reduceMotion = usePrefersReducedMotion();
  const isDark = theme === "dark";
  const buttonRef = useRef(null);

  function handleClick() {
    animateThemeToggle(toggleTheme, buttonRef.current, { reduceMotion });
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      className="rounded-lg border border-surface-border bg-surface-card p-2 text-ink-secondary shadow-sm hover:bg-surface-hover"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export default function TopBar({ lastUpdated, onOpenMobileNav, showCounter = true }) {
  // Dates come from the API as date-only strings ("2026-07-31"); formatting
  // in local time can roll them back a day west of UTC, so format in UTC to
  // match how the date-only string was parsed.
  const formattedTimestamp = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";

  return (
    <header className="flex items-center justify-between border-b border-surface-border bg-surface-card px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="rounded-md p-1.5 text-ink-secondary hover:bg-surface-hover lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <Link to="/" className="flex items-baseline gap-1.5">
          <span className="text-lg font-extrabold tracking-tight text-heading">StyleCraft</span>
          <span className="text-lg font-extrabold tracking-tight text-actual">360</span>
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <DateRangeSelector />
        <ThemeToggle />
        <div className="hidden text-xs text-ink-secondary sm:block">
          Last updated <span className="font-medium text-ink">{formattedTimestamp}</span>
        </div>
        {showCounter && <CompactCounter />}
      </div>
    </header>
  );
}
