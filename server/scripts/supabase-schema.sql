-- StyleCraft 360 — Supabase schema (run once in the Supabase SQL editor)
-- Mirrors the existing file-based storage shapes exactly, so no business
-- logic elsewhere in the app needs to change — only the 4 modules that
-- read/write these shapes swap their storage backend.

-- One row per applied snapshot (mirrors server/data/uploads/<timestamp>.json).
-- `departments` is the exact same {sales: {METRICS: [...]}, ...} object the
-- app already produces — stored as jsonb, untouched shape.
create table if not exists snapshots (
  id bigint primary key,              -- the same millisecond timestamp used as the old filename
  applied_at timestamptz not null,
  note text not null default '',
  filename text not null,
  source text not null,               -- "Upload" | "Manual entry"
  departments jsonb not null
);
create index if not exists snapshots_id_desc on snapshots (id desc);

-- Small key-value table for the two pieces of app-wide state that aren't a
-- versioned snapshot: which snapshot is currently active, and the lifetime
-- counter (mirrors active.json and counter.json).
create table if not exists app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- One real row per account (mirrors users.json's {users: [...]} array).
create table if not exists users (
  username text primary key,
  name text not null,
  role text not null check (role in ('admin', 'viewer')),
  password_hash text not null
);

-- Admin-added metrics (Settings → Add Graph). Each row is merged into
-- shared/metricRegistry.mjs's in-memory registry at read time (see
-- server/data/customMetrics.js) — this is the ONLY structural difference
-- from a built-in metric; its actual weekly numbers still live in the same
-- snapshots.departments[department].METRICS sparse array as everything else.
create table if not exists custom_metrics (
  slug text primary key,
  name text not null,
  department text not null check (department in ('sales', 'inventory', 'finance', 'operations', 'marketing', 'customer-service')),
  created_at timestamptz not null default now()
);
