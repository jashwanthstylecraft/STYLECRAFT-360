import { useEffect, useState } from "react";
import { getVisibilityFloor, VISIBILITY_FLOOR_CHANGED_EVENT } from "../utils/dataVisibility";

// Reactive read of the Settings-page visibility floor — see
// utils/dataVisibility.js. Same same-tab-custom-event pattern as
// usePrefersReducedMotion's override, since localStorage's own "storage"
// event only fires in OTHER tabs.
export function useVisibilityFloor() {
  const [floor, setFloor] = useState(getVisibilityFloor);

  useEffect(() => {
    const update = () => setFloor(getVisibilityFloor());
    window.addEventListener(VISIBILITY_FLOOR_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(VISIBILITY_FLOOR_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return floor;
}
