import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { GOOGLE_SIGN_IN_URL } from "../services/api";
import stylecraftLogo from "../assets/stylecraft-logo.png";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.97v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.97A9 9 0 0 0 0 9c0 1.45.35 2.83.97 4.03l2.98-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .97 4.97l2.98 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get("error");

  const [showAdminForm, setShowAdminForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname ?? "/";

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
            <div className="space-y-4">
              {oauthError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                  <AlertTriangle size={16} className="shrink-0" />
                  {oauthError}
                </div>
              )}

              {/* Full-page redirect into Google's own consent screen — proves
                  the signer-in actually owns that stylecraftus.com mailbox
                  (Google Workspace), unlike the old type-any-allowed-email
                  gate this replaced. The allowlist is still checked
                  server-side on the way back (see routes/auth.js). */}
              <a
                href={GOOGLE_SIGN_IN_URL}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-surface-hover"
              >
                <GoogleIcon />
                Sign in with Google
              </a>

              <p className="text-center text-xs text-ink-muted">
                Reserved for StyleCraft's directors — only approved @stylecraftus.com accounts can get in.
              </p>
            </div>
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
            {showAdminForm ? "Back to Google sign-in" : "Admin sign-in"}
          </button>
        </div>
      </div>
    </div>
  );
}
