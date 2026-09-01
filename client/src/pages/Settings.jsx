import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, Check, AlertTriangle, EyeOff, Trash2, KeyRound, UserPlus, PlusCircle } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useCounter } from "../hooks/useCounter";
import { getReducedMotionOverride, setReducedMotionOverride } from "../hooks/usePrefersReducedMotion";
import { getVisibilityFloor, setVisibilityFloor } from "../utils/dataVisibility";
import { snapToNearestWeekEnding } from "../utils/datePresets";
import { CALENDAR_START, CALENDAR_END, formatWeekEndingLabel } from "../utils/weekCalendar";
import { invalidateAllDataQueries } from "../hooks/dataQueryKeys";
import {
  setCounterTotal,
  fetchUsers,
  addUser,
  removeUser,
  resetUserPassword,
  fetchCustomMetrics,
  addCustomMetric,
  removeCustomMetric,
} from "../services/api";

const DEPARTMENT_OPTIONS = [
  { value: "sales", label: "Sales" },
  { value: "operations", label: "Operations" },
  { value: "inventory", label: "Inventory" },
  { value: "finance", label: "Finance" },
  { value: "marketing", label: "Marketing" },
  { value: "customer-service", label: "Customer Service" },
];

function SettingsSection({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-heading">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-secondary">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function OptionButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-actual bg-actual/10 text-actual"
          : "border-surface-border text-ink-secondary hover:bg-surface-hover"
      }`}
    >
      {children}
    </button>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsSection title="Appearance" description="Choose how StyleCraft 360 looks on this device.">
      <div className="flex gap-2">
        <OptionButton active={theme === "light"} onClick={() => setTheme("light")}>
          <span className="flex items-center gap-1.5">
            <Sun size={14} />
            Light
          </span>
        </OptionButton>
        <OptionButton active={theme === "dark"} onClick={() => setTheme("dark")}>
          <span className="flex items-center gap-1.5">
            <Moon size={14} />
            Dark
          </span>
        </OptionButton>
      </div>
    </SettingsSection>
  );
}

function MotionSection() {
  const [override, setOverride] = useState(getReducedMotionOverride);

  function choose(value) {
    setReducedMotionOverride(value);
    setOverride(value);
  }

  return (
    <SettingsSection
      title="Motion"
      description="Card entrances and chart animations. 'Match system' follows your OS's reduced-motion setting."
    >
      <div className="flex flex-wrap gap-2">
        <OptionButton active={override === null} onClick={() => choose(null)}>
          Match system
        </OptionButton>
        <OptionButton active={override === false} onClick={() => choose(false)}>
          Always animate
        </OptionButton>
        <OptionButton active={override === true} onClick={() => choose(true)}>
          Reduce motion
        </OptionButton>
      </div>
    </SettingsSection>
  );
}

function DataVisibilitySection() {
  const [floor, setFloor] = useState(getVisibilityFloor);
  const [dateInput, setDateInput] = useState(floor.from ?? "");

  function persist(next) {
    setVisibilityFloor(next);
    setFloor(next);
  }

  function handleToggle() {
    if (floor.enabled) {
      persist({ enabled: false, from: floor.from });
      return;
    }
    if (!floor.from) return; // need a date picked before turning it on
    persist({ enabled: true, from: floor.from });
  }

  function handleApplyDate() {
    if (!dateInput) return;
    const snapped = snapToNearestWeekEnding(dateInput);
    persist({ enabled: true, from: snapped });
    setDateInput(snapped);
  }

  return (
    <SettingsSection
      title="Data visibility"
      description="Hide older weeks from every dashboard, detail page, and home insight — nothing is deleted or changed, and turning this off brings the full history straight back. Data Entry and the Data page always show everything regardless."
    >
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={handleToggle}
          disabled={!floor.enabled && !floor.from}
          role="switch"
          aria-checked={floor.enabled}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            floor.enabled ? "bg-actual" : "bg-slate-300 dark:bg-white/10"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              floor.enabled ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm font-medium text-ink">
          {floor.enabled && floor.from ? (
            <span className="flex items-center gap-1.5">
              <EyeOff size={14} className="text-ink-muted" />
              Hiding weeks before {formatWeekEndingLabel(floor.from)}
            </span>
          ) : (
            "Showing full history"
          )}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted" htmlFor="visibility-floor-date">
            Only show data from
          </label>
          <input
            id="visibility-floor-date"
            type="date"
            min={CALENDAR_START}
            max={CALENDAR_END}
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink focus:border-actual focus:outline-none"
          />
        </div>
        <button
          onClick={handleApplyDate}
          disabled={!dateInput}
          className="rounded-lg bg-actual px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-actual-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          Apply
        </button>
      </div>
    </SettingsSection>
  );
}

function CounterSection() {
  const { total, isPlaceholder } = useCounter();
  const [input, setInput] = useState("");
  const [status, setStatus] = useState(null); // { ok, message }
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const parsed = Number(input.replace(/,/g, ""));
    if (!Number.isInteger(parsed) || parsed < 0) {
      setStatus({ ok: false, message: "Enter a whole, non-negative number." });
      return;
    }
    setIsSaving(true);
    setStatus(null);
    try {
      await setCounterTotal(parsed);
      setStatus({ ok: true, message: "Lifetime total updated." });
      setInput("");
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      title="Lifetime units counter"
      description="The number on the home page hero and the top bar. Set the real, confirmed total here — this is the only way to clear the 'unverified placeholder' marker."
    >
      <div className="mb-4 flex items-baseline gap-3">
        <span className="text-2xl font-bold tabular-nums text-heading">
          {total === null ? "—" : total.toLocaleString("en-US")}
        </span>
        {isPlaceholder && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30">
            <AlertTriangle size={12} />
            Unverified placeholder
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted" htmlFor="counter-total">
            Real lifetime total
          </label>
          <input
            id="counter-total"
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 100250000"
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink focus:border-actual focus:outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!input || isSaving}
          className="rounded-lg bg-actual px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-actual-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? "Saving…" : "Set total"}
        </button>
      </div>

      {status && (
        <div className={`mt-3 flex items-center gap-2 text-sm ${status.ok ? "text-positive" : "text-negative"}`}>
          {status.ok ? <Check size={15} /> : <AlertTriangle size={15} />}
          {status.message}
        </div>
      )}
    </SettingsSection>
  );
}

function TeamSection() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetTarget, setResetTarget] = useState(null); // username currently being reset
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const refresh = useCallback(() => {
    fetchUsers()
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await addUser({ username: newUsername, name: newName, password: newPassword });
      setNewUsername("");
      setNewName("");
      setNewPassword("");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(username) {
    setError(null);
    try {
      await removeUser(username);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleResetPassword(username) {
    if (!resetPasswordValue) return;
    setError(null);
    try {
      await resetUserPassword(username, resetPasswordValue);
      setResetTarget(null);
      setResetPasswordValue("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <SettingsSection
      title="Team"
      description="Admins (you and Mark) can edit and save anything. Viewers can only look at dashboards — Data Entry, Data, and this Team panel are hidden for them."
    >
      <div className="mb-4 space-y-2">
        {users === null && <div className="text-sm text-ink-muted">Loading…</div>}
        {users?.map((u) => (
          <div key={u.username} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-ink">{u.name}</div>
              <div className="truncate text-xs text-ink-muted">
                {u.username} · <span className="capitalize">{u.role}</span>
              </div>
            </div>
            {u.role === "viewer" && (
              <div className="flex shrink-0 items-center gap-2">
                {resetTarget === u.username ? (
                  <>
                    <input
                      type="password"
                      autoFocus
                      value={resetPasswordValue}
                      onChange={(e) => setResetPasswordValue(e.target.value)}
                      placeholder="New password"
                      className="w-36 rounded-lg border border-surface-border bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-actual focus:outline-none"
                    />
                    <button
                      onClick={() => handleResetPassword(u.username)}
                      disabled={!resetPasswordValue}
                      className="rounded-lg bg-actual px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setResetTarget(null);
                        setResetPasswordValue("");
                      }}
                      className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-ink-secondary hover:bg-surface-hover"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setResetTarget(u.username)}
                      className="rounded-md p-1.5 text-ink-secondary hover:bg-surface-hover"
                      title="Reset password"
                      aria-label={`Reset password for ${u.name}`}
                    >
                      <KeyRound size={15} />
                    </button>
                    <button
                      onClick={() => handleRemove(u.username)}
                      className="rounded-md p-1.5 text-negative hover:bg-surface-hover"
                      title="Remove"
                      aria-label={`Remove ${u.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Jamie"
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink focus:border-actual focus:outline-none"
            required
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Username / email</label>
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="jamie@stylecraftus.com"
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink focus:border-actual focus:outline-none"
            required
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink focus:border-actual focus:outline-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-lg bg-actual px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-actual-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <UserPlus size={15} />
          Add viewer
        </button>
      </form>
    </SettingsSection>
  );
}

function AddGraphSection() {
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState(DEPARTMENT_OPTIONS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = useCallback(() => {
    fetchCustomMetrics()
      .then((data) => setMetrics(data.metrics))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await addCustomMetric({ name, department });
      setName("");
      refresh();
      invalidateAllDataQueries(queryClient);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(slug) {
    setError(null);
    try {
      await removeCustomMetric(slug);
      refresh();
      invalidateAllDataQueries(queryClient);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <SettingsSection
      title="Add a graph"
      description="Adds a new metric card to a department, using the same styling as every other graph (Result vs. Goal, blue/red, standard chart) — just give it a title and pick a department. Enter its weekly numbers from Data Entry once it's added."
    >
      <div className="mb-4 space-y-2">
        {metrics === null && <div className="text-sm text-ink-muted">Loading…</div>}
        {metrics?.length === 0 && <div className="text-sm text-ink-muted">No custom graphs added yet.</div>}
        {metrics?.map((m) => (
          <div key={m.slug} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-ink">{m.name}</div>
              <div className="truncate text-xs text-ink-muted">
                {DEPARTMENT_OPTIONS.find((d) => d.value === m.department)?.label ?? m.department}
              </div>
            </div>
            <button
              onClick={() => handleRemove(m.slug)}
              className="shrink-0 rounded-md p-1.5 text-negative hover:bg-surface-hover"
              title="Remove"
              aria-label={`Remove ${m.name}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Graph title</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Website Uptime"
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink focus:border-actual focus:outline-none"
            required
          />
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink focus:border-actual focus:outline-none"
          >
            {DEPARTMENT_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!name.trim() || isSubmitting}
          className="flex items-center gap-1.5 rounded-lg bg-actual px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-actual-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlusCircle size={15} />
          Add graph
        </button>
      </form>
    </SettingsSection>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <PageShell lastUpdated={null}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Settings</h1>
        <p className="mt-1 text-sm text-ink-secondary">Display preferences, data visibility, and the lifetime units counter.</p>
      </div>

      <div className="max-w-2xl space-y-5">
        <AppearanceSection />
        <MotionSection />
        <DataVisibilitySection />
        {isAdmin && <CounterSection />}
        {isAdmin && <AddGraphSection />}
        {isAdmin && <TeamSection />}
      </div>
    </PageShell>
  );
}
