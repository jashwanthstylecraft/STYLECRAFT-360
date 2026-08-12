import { useEffect, useState } from "react";

const STORAGE_KEY = "stylecraft-reduced-motion-override";
const OVERRIDE_CHANGED_EVENT = "stylecraft-motion-override-changed";

// value: true (always reduce) | false (never reduce) | null (match OS setting)
export function setReducedMotionOverride(value) {
  if (value === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, String(value));
  window.dispatchEvent(new Event(OVERRIDE_CHANGED_EVENT));
}

export function getReducedMotionOverride() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return null;
}

function resolve() {
  const override = getReducedMotionOverride();
  if (override !== null) return override;
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Every card/chart in the app calls this independently rather than reading
// from a shared context, so a same-tab Settings change has to reach all of
// them via a plain window event (localStorage's own "storage" event only
// fires in OTHER tabs) — see setReducedMotionOverride above.
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(resolve);

  useEffect(() => {
    const update = () => setReduced(resolve());
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    query.addEventListener("change", update);
    window.addEventListener(OVERRIDE_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      query.removeEventListener("change", update);
      window.removeEventListener(OVERRIDE_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return reduced;
}
