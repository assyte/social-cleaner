import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Phase 1 schema. Phase 2–5 tables (sources, findings, evidence, …) are designed
 * in docs/DATA-MODEL.md and will arrive with their own migration when the code
 * that writes them exists.
 *
 * Conventions:
 * - text ids with a type prefix (`usr_…`), never autoincrement;
 * - integer timestamps in Unix milliseconds;
 * - P2 columns end with `_enc` (AES-256-GCM) and have a `_bidx` twin when
 * equality search is required.
 */

const timestamps = {
 createdAt: integer("created_at").notNull(),
 updatedAt: integer("updated_at").notNull(),
};

export const users = sqliteTable(
 "users",
 {
 id: text("id").primaryKey(),
 emailEnc: text("email_enc").notNull(),
 emailBidx: text("email_bidx").notNull(),
 passwordHash: text("password_hash").notNull(),
 displayNameEnc: text("display_name_enc"),
 role: text("role").notNull().default("user"),
 status: text("status").notNull().default("active"),
 plan: text("plan").notNull().default("free"), // free | pro
 planRenewsAt: integer("plan_renews_at"),
 failedLoginCount: integer("failed_login_count").notNull().default(0),
 lockedUntil: integer("locked_until"),
 lastLoginAt: integer("last_login_at"),
 ...timestamps,
 },
 (t) => [uniqueIndex("users_email_bidx_uq").on(t.emailBidx)],
);

export const sessions = sqliteTable(
 "sessions",
 {
 id: text("id").primaryKey(),
 userId: text("user_id")
 .notNull()
 .references(() => users.id, { onDelete: "cascade" }),
 tokenHash: text("token_hash").notNull(),
 csrfHash: text("csrf_hash").notNull(),
 ipHash: text("ip_hash"),
 userAgentHash: text("user_agent_hash"),
 createdAt: integer("created_at").notNull(),
 lastSeenAt: integer("last_seen_at").notNull(),
 expiresAt: integer("expires_at").notNull(),
 revokedAt: integer("revoked_at"),
 },
 (t) => [
 uniqueIndex("sessions_token_uq").on(t.tokenHash),
 index("sessions_user_idx").on(t.userId),
 index("sessions_expiry_idx").on(t.expiresAt),
 ],
);

export const identityProfiles = sqliteTable(
 "identity_profiles",
 {
 id: text("id").primaryKey(),
 userId: text("user_id")
 .notNull()
 .references(() => users.id, { onDelete: "cascade" }),
 version: integer("version").notNull().default(1),
 ownerDeclared: integer("owner_declared").notNull().default(0),
 ownerDeclaredAt: integer("owner_declared_at"),
 createdAt: integer("created_at").notNull(),
 updatedAt: integer("updated_at").notNull(),
 },
 (t) => [uniqueIndex("identity_profiles_user_uq").on(t.userId)],
);

export const identityNames = sqliteTable(
 "identity_names",
 {
 id: text("id").primaryKey(),
 profileId: text("profile_id")
 .notNull()
 .references(() => identityProfiles.id, { onDelete: "cascade" }),
 kind: text("kind").notNull(), // legal | former | nickname | transliteration
 valueEnc: text("value_enc").notNull(),
 valueBidx: text("value_bidx").notNull(),
 isPrimary: integer("is_primary").notNull().default(0),
 verification: text("verification").notNull().default("user_provided"),
 notesEnc: text("notes_enc"),
 createdAt: integer("created_at").notNull(),
 },
 (t) => [
 uniqueIndex("identity_names_profile_value_uq").on(t.profileId, t.valueBidx),
 index("identity_names_profile_idx").on(t.profileId),
 ],
);

export const identityAliases = sqliteTable(
 "identity_aliases",
 {
 id: text("id").primaryKey(),
 profileId: text("profile_id")
 .notNull()
 .references(() => identityProfiles.id, { onDelete: "cascade" }),
 handle: text("handle").notNull(),
 handleNormalized: text("handle_normalized").notNull(),
 origin: text("origin").notNull().default("user_provided"), // user_provided | generated_variant
 platformsJson: text("platforms_json").notNull().default("[]"),
 startPeriod: text("start_period"),
 endPeriod: text("end_period"),
 verification: text("verification").notNull().default("unverified"),
 notesEnc: text("notes_enc"),
 ...timestamps,
 },
 (t) => [
 uniqueIndex("identity_aliases_profile_handle_origin_uq").on(
 t.profileId,
 t.handleNormalized,
 t.origin,
 ),
 index("identity_aliases_normalized_idx").on(t.handleNormalized),
 ],
);

export const identityContacts = sqliteTable(
 "identity_contacts",
 {
 id: text("id").primaryKey(),
 profileId: text("profile_id")
 .notNull()
 .references(() => identityProfiles.id, { onDelete: "cascade" }),
 kind: text("kind").notNull(), // email | phone
 valueEnc: text("value_enc").notNull(),
 valueBidx: text("value_bidx").notNull(),
 consentSearch: integer("consent_search").notNull().default(0),
 isPublic: integer("is_public").notNull().default(0),
 verification: text("verification").notNull().default("unverified"),
 createdAt: integer("created_at").notNull(),
 },
 (t) => [
 uniqueIndex("identity_contacts_profile_kind_value_uq").on(t.profileId, t.kind, t.valueBidx),
 ],
);

export const identityLinks = sqliteTable(
 "identity_links",
 {
 id: text("id").primaryKey(),
 profileId: text("profile_id")
 .notNull()
 .references(() => identityProfiles.id, { onDelete: "cascade" }),
 kind: text("kind").notNull(), // profile | website | blog | forum | game | other
 url: text("url").notNull(),
 label: text("label"),
 verification: text("verification").notNull().default("user_provided"),
 createdAt: integer("created_at").notNull(),
 },
 (t) => [uniqueIndex("identity_links_profile_url_uq").on(t.profileId, t.url)],
);

export const researchScopes = sqliteTable(
 "research_scopes",
 {
 id: text("id").primaryKey(),
 profileId: text("profile_id")
 .notNull()
 .references(() => identityProfiles.id, { onDelete: "cascade" }),
 mode: text("mode").notNull().default("read_only"),
 depth: text("depth").notNull().default("standard"),
 platformsJson: text("platforms_json").notNull().default("[]"),
 searchName: integer("search_name").notNull().default(1),
 searchAliases: integer("search_aliases").notNull().default(1),
 searchContacts: integer("search_contacts").notNull().default(0),
 maxQueries: integer("max_queries").notNull().default(200),
 maxCostCents: integer("max_cost_cents").notNull().default(0),
 maxDepth: integer("max_depth").notNull().default(2),
 createdAt: integer("created_at").notNull(),
 updatedAt: integer("updated_at").notNull(),
 },
 (t) => [uniqueIndex("research_scopes_profile_uq").on(t.profileId)],
);

export const consentRecords = sqliteTable(
 "consent_records",
 {
 id: text("id").primaryKey(),
 userId: text("user_id")
 .notNull()
 .references(() => users.id, { onDelete: "cascade" }),
 scope: text("scope").notNull(),
 granted: integer("granted").notNull(),
 policyVersion: text("policy_version").notNull(),
 createdAt: integer("created_at").notNull(),
 revokedAt: integer("revoked_at"),
 },
 (t) => [index("consent_records_user_scope_idx").on(t.userId, t.scope, t.createdAt)],
);

export const auditEvents = sqliteTable(
 "audit_events",
 {
 id: text("id").primaryKey(),
 userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
 actorType: text("actor_type").notNull().default("user"),
 action: text("action").notNull(),
 entityType: text("entity_type"),
 entityId: text("entity_id"),
 outcome: text("outcome").notNull().default("success"),
 metaJson: text("meta_json").notNull().default("{}"),
 ipHash: text("ip_hash"),
 createdAt: integer("created_at").notNull(),
 },
 (t) => [index("audit_events_user_created_idx").on(t.userId, t.createdAt)],
);

/**
 * Phase 2A search runs. The query is always encrypted; for public handles the
 * masked column stores the readable handle because it is already public.
 */
export const searchRuns = sqliteTable(
 "search_runs",
 {
 id: text("id").primaryKey(),
 userId: text("user_id")
 .notNull()
 .references(() => users.id, { onDelete: "cascade" }),
 fieldType: text("field_type").notNull(), // username | email | name | phone
 queryEnc: text("query_enc").notNull(),
 queryMasked: text("query_masked").notNull(),
 status: text("status").notNull().default("running"), // running | completed | failed
 platformIdsJson: text("platform_ids_json").notNull().default("[]"),
 checkedCount: integer("checked_count").notNull().default(0),
 foundCount: integer("found_count").notNull().default(0),
 hiddenCount: integer("hidden_count").notNull().default(0),
 blockedCount: integer("blocked_count").notNull().default(0),
 errorCount: integer("error_count").notNull().default(0),
 errorCode: text("error_code"),
 /** JSON array of per-platform outcomes (found / not_found / blocked / unsupported / error). */
 outcomesJson: text("outcomes_json").notNull().default("[]"),
 createdAt: integer("created_at").notNull(),
 finishedAt: integer("finished_at"),
 },
 (t) => [index("search_runs_user_created_idx").on(t.userId, t.createdAt)],
);

export const searchResults = sqliteTable(
 "search_results",
 {
 id: text("id").primaryKey(),
 runId: text("run_id")
 .notNull()
 .references(() => searchRuns.id, { onDelete: "cascade" }),
 platformId: text("platform_id").notNull(),
 platformName: text("platform_name").notNull(),
 profileUrl: text("profile_url").notNull(),
 handle: text("handle").notNull(),
 confidence: integer("confidence").notNull().default(0),
 verification: text("verification").notNull().default("verified"), // verified | possible | mention
 evidenceJson: text("evidence_json").notNull().default("{}"),
 createdAt: integer("created_at").notNull(),
 },
 (t) => [
 uniqueIndex("search_results_run_platform_uq").on(t.runId, t.platformId),
 index("search_results_run_idx").on(t.runId),
 ],
);

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type IdentityProfileRow = typeof identityProfiles.$inferSelect;
export type IdentityNameRow = typeof identityNames.$inferSelect;
export type IdentityAliasRow = typeof identityAliases.$inferSelect;
export type IdentityContactRow = typeof identityContacts.$inferSelect;
export type IdentityLinkRow = typeof identityLinks.$inferSelect;
export type ResearchScopeRow = typeof researchScopes.$inferSelect;
export type ConsentRecordRow = typeof consentRecords.$inferSelect;
export type AuditEventRow = typeof auditEvents.$inferSelect;
export type SearchRunRow = typeof searchRuns.$inferSelect;
export type SearchResultRow = typeof searchResults.$inferSelect;
