import { Component } from "react";
import { AlertTriangle } from "lucide-react";

// Without this, an uncaught render error anywhere on a page (one bad metric
// card, a malformed chart prop) unmounts the whole React tree and the user
// sees a blank screen with no clue why. Scoped to <main> in PageShell, not
// the whole app, so the sidebar/topbar survive and navigating away recovers.
export default class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[PageErrorBoundary] caught:", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Something went wrong rendering this page.</div>
            <div className="mt-1 text-red-600/80 dark:text-red-400/80">{this.state.error.message}</div>
            <div className="mt-2 text-xs text-red-500/70 dark:text-red-400/60">
              Try reloading. If this keeps happening, send this message to support.
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
