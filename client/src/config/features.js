// Build-time feature flags. Default-on: only an explicit "false" disables a
// feature, so unset env vars (local dev, self-hosted) never silently turn
// something off.
export const ENABLE_EXCEL_EXPORT = import.meta.env.VITE_ENABLE_EXCEL_EXPORT !== "false";
