// The only place that knows how sales data is fetched. Swapping the seed API
// for a real backend later means changing this file, not any component.
const API_BASE = "/api";

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.error || `Request to ${path} failed with status ${res.status}`;
    const err = new Error(message);
    if (body?.errors) err.errors = body.errors;
    throw err;
  }
  return body;
}

function periodQuery(period) {
  return period && period !== "weekly" ? `&period=${encodeURIComponent(period)}` : "";
}

// from/to are omitted (not just empty) when absent — the server's own "no
// range requested" default (last 12 weeks ending at the latest real data)
// is what every page shows until the user picks a different date range.
function rangeQuery({ from, to } = {}) {
  return from && to ? `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : "";
}

export function fetchSalesMetrics({ from, to, period } = {}) {
  return request(`/sales/metrics?_${rangeQuery({ from, to })}${periodQuery(period)}`);
}

export function fetchInventoryMetrics({ from, to, period } = {}) {
  return request(`/inventory/metrics?_${rangeQuery({ from, to })}${periodQuery(period)}`);
}

export function fetchFinanceMetrics({ from, to, period } = {}) {
  return request(`/finance/metrics?_${rangeQuery({ from, to })}${periodQuery(period)}`);
}

export function fetchOperationsMetrics({ from, to, period } = {}) {
  return request(`/operations/metrics?_${rangeQuery({ from, to })}${periodQuery(period)}`);
}

export function fetchHomeSummary({ from, to, period } = {}) {
  return request(`/home/summary?_${rangeQuery({ from, to })}${periodQuery(period)}`);
}

export function fetchHomeInsights({ from, to, visibleFrom } = {}) {
  const visibleFromQuery = visibleFrom ? `&visibleFrom=${encodeURIComponent(visibleFrom)}` : "";
  return request(`/home/insights?_${rangeQuery({ from, to })}${visibleFromQuery}`);
}

export function fetchDataStatus() {
  return request("/data/status");
}

export function fetchDataVersions() {
  return request("/data/versions");
}

export const TEMPLATE_DOWNLOAD_URL = `${API_BASE}/data/template`;

export function buildExportExcelUrl({ from, to } = {}) {
  return `${API_BASE}/export/excel?${rangeQuery({ from, to }).replace(/^&/, "")}`;
}

export function uploadDataFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/data/upload", { method: "POST", body: formData });
}

export function applyDataUpload(uploadId, note) {
  return request("/data/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId, note }),
  });
}

export function restoreDataVersion(versionId) {
  return request(`/data/versions/${encodeURIComponent(versionId)}/restore`, { method: "POST" });
}

export function fetchEntryData(weekEnding) {
  const query = weekEnding ? `?week=${encodeURIComponent(weekEnding)}` : "";
  return request(`/entry${query}`);
}

export function fetchEntryCoverage() {
  return request("/entry/coverage");
}

export function fetchMetricDetail(department, slug, { from, to, period } = {}) {
  return request(`/detail/${encodeURIComponent(department)}/${encodeURIComponent(slug)}?_${rangeQuery({ from, to })}${periodQuery(period)}`);
}

export function saveEntryWeek(weekEnding, entries, note) {
  return request(`/entry/week/${encodeURIComponent(weekEnding)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries, note }),
  });
}

export function setCounterTotal(total) {
  return request("/counter", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ total }),
  });
}
