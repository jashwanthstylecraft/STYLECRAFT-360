import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import stylecraftLogo from "../assets/stylecraft-logo.png";

export default function Login() {
  const { login, loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname ?? "/";

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithEmail(email);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAdminSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy p-4">
      {/* Calm, fixed brand backdrop — same in light/dark, since this page is
          the one place a deliberate look matters more than theme-matched
          neutrals. A smooth navy-to-blue gradient with one soft glow behind
          the card, no busy color blobs. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-navy via-[#0f2f5c] to-actual-strong" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b82f6]/25 blur-3xl" />

      <div className="relative flex w-full max-w-sm flex-col items-center">
        {/* The real brand logo is white-on-transparent, so it lives out here
            on the navy backdrop, not inside the (light) card below, where it
            would be invisible. */}
        <img src={stylecraftLogo} alt="StyleCraft" className="mb-6 w-56 drop-shadow-md" />

        <div className="w-full rounded-2xl border border-white/10 bg-surface-card p-6 shadow-2xl">
          <div className="mb-6 text-center leading-tight">
            <div className="text-sm font-extrabold tracking-wide text-heading">STYLECRAFT</div>
            <div className="text-xs font-semibold tracking-widest text-actual">360</div>
          <div className="mt-3 text-lg font-bold text-heading">Welcome, Directors</div>
          <p className="mt-1 text-xs text-ink-muted">Director-level access to the StyleCraft 360 dashboard.</p>
        </div>

        {!showAdminForm ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted" htmlFor="login-email">
                Work email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@stylecraftus.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink focus:border-actual focus:outline-none"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                <AlertTriangle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-actual px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-actual-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? "Checking…" : "Continue"}
            </button>

            <p className="text-center text-xs text-ink-muted">
              Reserved for StyleCraft's directors — only approved emails can get in.
            </p>
          </form>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted" htmlFor="login-username">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink focus:border-actual focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-ink focus:border-actual focus:outline-none"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                <AlertTriangle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-actual px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-actual-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowAdminForm((v) => !v);
          }}
          className="mt-4 w-full text-center text-xs font-medium text-ink-muted underline-offset-2 hover:text-actual hover:underline"
        >
            {showAdminForm ? "Back to email sign-in" : "Admin sign-in"}
          </button>
        </div>
      </div>
    </div>
  );
}
