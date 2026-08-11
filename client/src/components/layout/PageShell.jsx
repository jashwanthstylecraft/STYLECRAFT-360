import { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { getScrollPosition, saveScrollPosition } from "../../utils/scrollPositions";

// `scrollKey` is opt-in — pages that don't pass it (every page except the
// four department pages, which pass their own key so returning from a
// metric detail page lands back where you left off) get today's exact
// behavior: scrollTop simply starts at 0 on every mount.
export default function PageShell({ lastUpdated, showCounter = true, scrollKey, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    if (!scrollKey) return undefined;
    const el = mainRef.current;
    const saved = getScrollPosition(scrollKey);
    if (el && saved !== undefined) el.scrollTop = saved;
    return () => {
      if (el) saveScrollPosition(scrollKey, el.scrollTop);
    };
  }, [scrollKey]);

  return (
    <div className="flex h-screen bg-surface">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          lastUpdated={lastUpdated}
          onOpenMobileNav={() => setMobileOpen(true)}
          showCounter={showCounter}
        />
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
