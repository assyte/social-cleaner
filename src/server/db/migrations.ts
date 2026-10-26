/**
 * Embedded, ordered migrations.
 *
 * SQL lives in TypeScript (not loose .sql files) so that the production bundle
 * and the worker process always carry exactly the same schema — no runtime file
 * reads, no "migration folder missing" failure after deployment.
 */

export type Migration = { id: string; statements: string[] };

export const MIGRATIONS: Migration[] = [
 {
 id: "0001_identity_vault",
 statements: [
 `CREATE TABLE users (
 id TEXT PRIMARY KEY,
 email_enc TEXT NOT NULL,
 email_bidx TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 display_name_enc TEXT,
 role TEXT NOT NULL DEFAULT 'user',
 status TEXT NOT NULL DEFAULT 'active',
 failed_login_count INTEGER NOT NULL DEFAULT 0,
 locked_until INTEGER,
 last_login_at INTEGER,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
 )`,
 `CREATE UNIQUE INDEX users_email_bidx_uq ON users (email_bidx)`,
 `CREATE TABLE sessions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL,
 csrf_hash TEXT NOT NULL,
 ip_hash TEXT,
 user_agent_hash TEXT,
 created_at INTEGER NOT NULL,
 last_seen_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 revoked_at INTEGER
 )`,
 `CREATE UNIQUE INDEX sessions_token_uq ON sessions (token_hash)`,
 `CREATE INDEX sessions_user_idx ON sessions (user_id)`,
 `CREATE INDEX sessions_expiry_idx ON sessions (expires_at)`,
 `CREATE TABLE identity_profiles (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 version INTEGER NOT NULL DEFAULT 1,
 owner_declared INTEGER NOT NULL DEFAULT 0,
 owner_declared_at INTEGER,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
 )`,
 `CREATE UNIQUE INDEX identity_profiles_user_uq ON identity_profiles (user_id)`,
 `CREATE TABLE identity_names (
 id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES identity_profiles(id) ON DELETE CASCADE,
 kind TEXT NOT NULL,
 value_enc TEXT NOT NULL,
 value_bidx TEXT NOT NULL,
 is_primary INTEGER NOT NULL DEFAULT 0,
 verification TEXT NOT NULL DEFAULT 'user_provided',
 notes_enc TEXT,
 created_at INTEGER NOT NULL
 )`,
 `CREATE UNIQUE INDEX identity_names_profile_value_uq ON identity_names (profile_id, value_bidx)`,
 `CREATE INDEX identity_names_profile_idx ON identity_names (profile_id)`,
 `CREATE TABLE identity_aliases (
 id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES identity_profiles(id) ON DELETE CASCADE,
 handle TEXT NOT NULL,
 handle_normalized TEXT NOT NULL,
 origin TEXT NOT NULL DEFAULT 'user_provided',
 platforms_json TEXT NOT NULL DEFAULT '[]',
 start_period TEXT,
 end_period TEXT,
 verification TEXT NOT NULL DEFAULT 'unverified',
 notes_enc TEXT,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
 )`,
 `CREATE UNIQUE INDEX identity_aliases_profile_handle_origin_uq
 ON identity_aliases (profile_id, handle_normalized, origin)`,
 `CREATE INDEX identity_aliases_normalized_idx ON identity_aliases (handle_normalized)`,
 `CREATE TABLE identity_contacts (
 id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES identity_profiles(id) ON DELETE CASCADE,
 kind TEXT NOT NULL,
 value_enc TEXT NOT NULL,
 value_bidx TEXT NOT NULL,
 consent_search INTEGER NOT NULL DEFAULT 0,
 is_public INTEGER NOT NULL DEFAULT 0,
 verification TEXT NOT NULL DEFAULT 'unverified',
 created_at INTEGER NOT NULL
 )`,
 `CREATE UNIQUE INDEX identity_contacts_profile_kind_value_uq
 ON identity_contacts (profile_id, kind, value_bidx)`,
 `CREATE TABLE identity_links (
 id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES identity_profiles(id) ON DELETE CASCADE,
 kind TEXT NOT NULL,
 url TEXT NOT NULL,
 label TEXT,
 verification TEXT NOT NULL DEFAULT 'user_provided',
 created_at INTEGER NOT NULL
 )`,
 `CREATE UNIQUE INDEX identity_links_profile_url_uq ON identity_links (profile_id, url)`,
 `CREATE TABLE research_scopes (
 id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES identity_profiles(id) ON DELETE CASCADE,
 mode TEXT NOT NULL DEFAULT 'read_only',
 depth TEXT NOT NULL DEFAULT 'standard',
 platforms_json TEXT NOT NULL DEFAULT '[]',
 search_name INTEGER NOT NULL DEFAULT 1,
 search_aliases INTEGER NOT NULL DEFAULT 1,
 search_contacts INTEGER NOT NULL DEFAULT 0,
 max_queries INTEGER NOT NULL DEFAULT 200,
 max_cost_cents INTEGER NOT NULL DEFAULT 0,
 max_depth INTEGER NOT NULL DEFAULT 2,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
 )`,
 `CREATE UNIQUE INDEX research_scopes_profile_uq ON research_scopes (profile_id)`,
 `CREATE TABLE consent_records (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 scope TEXT NOT NULL,
 granted INTEGER NOT NULL,
 policy_version TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 revoked_at INTEGER
 )`,
 `CREATE INDEX consent_records_user_scope_idx
 ON consent_records (user_id, scope, created_at)`,
 `CREATE TABLE audit_events (
 id TEXT PRIMARY KEY,
 user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
 actor_type TEXT NOT NULL DEFAULT 'user',
 action TEXT NOT NULL,
 entity_type TEXT,
 entity_id TEXT,
 outcome TEXT NOT NULL DEFAULT 'success',
 meta_json TEXT NOT NULL DEFAULT '{}',
 ip_hash TEXT,
 created_at INTEGER NOT NULL
 )`,
 `CREATE INDEX audit_events_user_created_idx ON audit_events (user_id, created_at)`,
 ],
 },
 {
 id: "0002_search_and_plans",
 statements: [
 `ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'`,
 `ALTER TABLE users ADD COLUMN plan_renews_at INTEGER`,
 `CREATE TABLE search_runs (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 field_type TEXT NOT NULL,
 query_enc TEXT NOT NULL,
 query_masked TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'running',
 platform_ids_json TEXT NOT NULL DEFAULT '[]',
 checked_count INTEGER NOT NULL DEFAULT 0,
 found_count INTEGER NOT NULL DEFAULT 0,
 hidden_count INTEGER NOT NULL DEFAULT 0,
 blocked_count INTEGER NOT NULL DEFAULT 0,
 error_count INTEGER NOT NULL DEFAULT 0,
 error_code TEXT,
 created_at INTEGER NOT NULL,
 finished_at INTEGER
 )`,
 `CREATE INDEX search_runs_user_created_idx ON search_runs (user_id, created_at)`,
 `CREATE TABLE search_results (
 id TEXT PRIMARY KEY,
 run_id TEXT NOT NULL REFERENCES search_runs(id) ON DELETE CASCADE,
 platform_id TEXT NOT NULL,
 platform_name TEXT NOT NULL,
 profile_url TEXT NOT NULL,
 handle TEXT NOT NULL,
 confidence INTEGER NOT NULL DEFAULT 0,
 verification TEXT NOT NULL DEFAULT 'verified',
 evidence_json TEXT NOT NULL DEFAULT '{}',
 created_at INTEGER NOT NULL
 )`,
 `CREATE UNIQUE INDEX search_results_run_platform_uq ON search_results (run_id, platform_id)`,
 `CREATE INDEX search_results_run_idx ON search_results (run_id)`,
 ],
 },
 {
 id: "0003_search_coverage_outcomes",
 statements: [
 `ALTER TABLE search_runs ADD COLUMN outcomes_json TEXT NOT NULL DEFAULT '[]'`,
 ],
 },
];
