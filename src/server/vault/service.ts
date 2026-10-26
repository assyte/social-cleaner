import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
 auditEvents,
 consentRecords,
 identityAliases,
 identityContacts,
 identityLinks,
 identityNames,
 identityProfiles,
 researchScopes,
 searchResults,
 searchRuns,
 users,
 type AuditEventRow,
 type IdentityProfileRow,
 type ResearchScopeRow,
} from "@/server/db/schema";
import { blindIndex } from "@/server/crypto/blind-index";
import { decryptField, encryptField, safeDecryptField } from "@/server/crypto/field-cipher";
import {
 canonicalName,
 normalizeEmail,
 normalizeHandle,
 normalizePhone,
} from "@/server/security/canonical";
import { maskEmail, maskPhone } from "@/server/security/masking";
import { assertUrlAllowed } from "@/server/security/ssrf-guard";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { newId, ID_PREFIXES } from "@/server/ids";
import { recordAudit } from "@/server/audit/log";
import { generateVariants, type Variant } from "@/server/vault/variants";
import type {
 AddAliasInput,
 AddLinkInput,
 AddNameInput,
 ContactInput,
 ScopeInput,
 UpdateAliasInput,
} from "@/server/vault/schemas";

const POLICY_VERSION = "2026-10-consent-v1";
const CONSENT_SCOPES = ["ownership_declaration", "contacts_search", "automated_removal", "monitoring"] as const;

export type ConsentScope = (typeof CONSENT_SCOPES)[number];

export type ScopeView = {
 id: string;
 mode: string;
 depth: string;
 platforms: string[];
 searchName: boolean;
 searchAliases: boolean;
 searchContacts: boolean;
 maxQueries: number;
 maxDepth: number;
 maxCostCents: number;
};

export type VaultView = {
 profile: {
 id: string;
 version: number;
 ownerDeclared: boolean;
 ownerDeclaredAt: number | null;
 updatedAt: number;
 };
 names: Array<{
 id: string;
 kind: string;
 value: string;
 isPrimary: boolean;
 verification: string;
 notes: string | null;
 createdAt: number;
 }>;
 aliases: Array<{
 id: string;
 handle: string;
 origin: string;
 platforms: string[];
 startPeriod: string | null;
 endPeriod: string | null;
 verification: string;
 notes: string | null;
 createdAt: number;
 }>;
 contacts: Array<{
 id: string;
 kind: "email" | "phone";
 valueMasked: string;
 consentSearch: boolean;
 isPublic: boolean;
 verification: string;
 createdAt: number;
 }>;
 links: Array<{
 id: string;
 kind: string;
 url: string;
 label: string | null;
 verification: string;
 createdAt: number;
 }>;
 scope: ScopeView;
 consents: Array<{ scope: string; granted: boolean; createdAt: number }>;
 variants: { names: Variant[]; aliases: Variant[]; contacts: Variant[]; total: number; notice: string };
 stats: {
 names: number;
 aliases: number;
 contacts: number;
 searchableContacts: number;
 links: number;
 };
};

function parseStringArray(raw: string): string[] {
 try {
 const value: unknown = JSON.parse(raw);
 if (!Array.isArray(value)) return [];
 return value.filter((item): item is string => typeof item === "string").slice(0, 60);
 } catch {
 return [];
 }
}

async function getProfile(userId: string): Promise<IdentityProfileRow> {
 const db = await getDb();
 const rows = await db
 .select()
 .from(identityProfiles)
 .where(eq(identityProfiles.userId, userId))
 .limit(1);
 if (rows[0]) return rows[0];

 const now = Date.now();
 const id = newId(ID_PREFIXES.profile);
 await db.insert(identityProfiles).values({ id, userId, createdAt: now, updatedAt: now });
 const reread = await db
 .select()
 .from(identityProfiles)
 .where(eq(identityProfiles.userId, userId))
 .limit(1);
 if (!reread[0]) throw notFound("Profile could not be created");
 return reread[0];
}

async function touchProfile(profileId: string): Promise<void> {
 const db = await getDb();
 const rows = await db
 .select({ version: identityProfiles.version })
 .from(identityProfiles)
 .where(eq(identityProfiles.id, profileId))
 .limit(1);
 const version = (rows[0]?.version ?? 0) + 1;
 await db
 .update(identityProfiles)
 .set({ version, updatedAt: Date.now() })
 .where(eq(identityProfiles.id, profileId));
}

export async function getScope(profileId: string): Promise<ResearchScopeRow> {
 const db = await getDb();
 const rows = await db
 .select()
 .from(researchScopes)
 .where(eq(researchScopes.profileId, profileId))
 .limit(1);
 if (rows[0]) return rows[0];
 const now = Date.now();
 const id = newId(ID_PREFIXES.scope);
 await db.insert(researchScopes).values({ id, profileId, createdAt: now, updatedAt: now });
 const reread = await db
 .select()
 .from(researchScopes)
 .where(eq(researchScopes.profileId, profileId))
 .limit(1);
 return reread[0]!;
}

export async function getActiveConsents(userId: string): Promise<Map<string, number>> {
 const db = await getDb();
 const rows = await db
 .select()
 .from(consentRecords)
 .where(and(eq(consentRecords.userId, userId), isNull(consentRecords.revokedAt)))
 .orderBy(desc(consentRecords.createdAt));
 const map = new Map<string, number>();
 for (const row of rows) {
 if (!map.has(row.scope) && row.granted === 1) map.set(row.scope, row.createdAt);
 }
 return map;
}

export async function getVault(userId: string): Promise<VaultView> {
 const db = await getDb();
 const profile = await getProfile(userId);

 const [nameRows, aliasRows, contactRows, linkRows, scopeRow, consentRows] = await Promise.all([
 db
 .select()
 .from(identityNames)
 .where(eq(identityNames.profileId, profile.id))
 .orderBy(desc(identityNames.isPrimary), identityNames.createdAt),
 db
 .select()
 .from(identityAliases)
 .where(eq(identityAliases.profileId, profile.id))
 .orderBy(identityAliases.createdAt),
 db
 .select()
 .from(identityContacts)
 .where(eq(identityContacts.profileId, profile.id))
 .orderBy(identityContacts.createdAt),
 db
 .select()
 .from(identityLinks)
 .where(eq(identityLinks.profileId, profile.id))
 .orderBy(identityLinks.createdAt),
 getScope(profile.id),
 db
 .select()
 .from(consentRecords)
 .where(and(eq(consentRecords.userId, userId), isNull(consentRecords.revokedAt)))
 .orderBy(desc(consentRecords.createdAt)),
 ]);

 const names = nameRows.map((row) => ({
 id: row.id,
 kind: row.kind,
 value: safeDecryptField(row.valueEnc, "identity_names.value"),
 isPrimary: row.isPrimary === 1,
 verification: row.verification,
 notes: row.notesEnc ? safeDecryptField(row.notesEnc, "identity_names.notes") : null,
 createdAt: row.createdAt,
 }));

 const aliases = aliasRows.map((row) => ({
 id: row.id,
 handle: row.handle,
 origin: row.origin,
 platforms: parseStringArray(row.platformsJson),
 startPeriod: row.startPeriod,
 endPeriod: row.endPeriod,
 verification: row.verification,
 notes: row.notesEnc ? safeDecryptField(row.notesEnc, "identity_aliases.notes") : null,
 createdAt: row.createdAt,
 }));

 const contacts = contactRows.map((row) => {
 const value = safeDecryptField(row.valueEnc, "identity_contacts.value", "");
 return {
 id: row.id,
 kind: row.kind as "email" | "phone",
 valueMasked:
 row.kind === "email" ? (value ? maskEmail(value) : "[unavailable]") : value ? maskPhone(value) : "[unavailable]",
 consentSearch: row.consentSearch === 1,
 isPublic: row.isPublic === 1,
 verification: row.verification,
 createdAt: row.createdAt,
 };
 });

 const links = linkRows.map((row) => ({
 id: row.id,
 kind: row.kind,
 url: row.url,
 label: row.label,
 verification: row.verification,
 createdAt: row.createdAt,
 }));

 const contactsWithConsent = contactRows
 .filter((row) => row.consentSearch === 1)
 .map((row) => ({
 kind: row.kind as "email" | "phone",
 value: safeDecryptField(row.valueEnc, "identity_contacts.value", ""),
 consentSearch: true,
 }))
 .filter((c) => c.value.length > 0);

 const variants = generateVariants({
 names: names.map((n) => n.value).filter((v) => v && v !== "[unavailable]"),
 aliases: aliases.map((a) => a.handle),
 contacts: contactsWithConsent,
 });

 const scope: ScopeView = {
 id: scopeRow.id,
 mode: scopeRow.mode,
 depth: scopeRow.depth,
 platforms: parseStringArray(scopeRow.platformsJson),
 searchName: scopeRow.searchName === 1,
 searchAliases: scopeRow.searchAliases === 1,
 searchContacts: scopeRow.searchContacts === 1,
 maxQueries: scopeRow.maxQueries,
 maxDepth: scopeRow.maxDepth,
 maxCostCents: scopeRow.maxCostCents,
 };

 const latestConsent = new Map<string, { scope: string; granted: boolean; createdAt: number }>();
 for (const row of consentRows) {
 if (!latestConsent.has(row.scope)) {
 latestConsent.set(row.scope, {
 scope: row.scope,
 granted: row.granted === 1,
 createdAt: row.createdAt,
 });
 }
 }

 return {
 profile: {
 id: profile.id,
 version: profile.version,
 ownerDeclared: profile.ownerDeclared === 1,
 ownerDeclaredAt: profile.ownerDeclaredAt,
 updatedAt: profile.updatedAt,
 },
 names,
 aliases,
 contacts,
 links,
 scope,
 consents: [...latestConsent.values()],
 variants,
 stats: {
 names: names.length,
 aliases: aliases.length,
 contacts: contacts.length,
 searchableContacts: contacts.filter((c) => c.consentSearch).length,
 links: links.length,
 },
 };
}

function isUniqueViolation(error: unknown): boolean {
 let current: unknown = error;
 for (let depth = 0; depth < 4 && current; depth += 1) {
 if (!(current instanceof Error)) break;
 if (/unique|constraint/i.test(current.message)) return true;
 const code = (current as { code?: unknown }).code;
 if (typeof code === "string" && /constraint/i.test(code)) return true;
 current = (current as { cause?: unknown }).cause;
 }
 return false;
}

export async function addName(userId: string, input: AddNameInput, request: Request): Promise<string> {
 const db = await getDb();
 const profile = await getProfile(userId);
 const canonical = canonicalName(input.value);
 if (canonical.length < 2) throw badRequest("Name must contain at least 2 meaningful characters");

 const id = newId(ID_PREFIXES.name);
 const now = Date.now();
 try {
 await db.transaction(async (tx) => {
 if (input.isPrimary) {
 await tx
 .update(identityNames)
 .set({ isPrimary: 0 })
 .where(eq(identityNames.profileId, profile.id));
 }
 await tx.insert(identityNames).values({
 id,
 profileId: profile.id,
 kind: input.kind,
 valueEnc: encryptField(input.value, "identity_names.value"),
 valueBidx: blindIndex("name", canonical),
 isPrimary: input.isPrimary ? 1 : 0,
 verification: "user_provided",
 notesEnc: input.notes ? encryptField(input.notes, "identity_names.notes") : null,
 createdAt: now,
 });
 });
 } catch (error) {
 if (isUniqueViolation(error)) throw conflict("DUPLICATE_NAME", "This name is already saved");
 throw error;
 }

 await touchProfile(profile.id);
 await recordAudit({
 userId,
 action: "vault.name.create",
 entityType: "identity_name",
 entityId: id,
 meta: { kind: input.kind },
 request,
 });
 return id;
}

export async function deleteName(userId: string, nameId: string, request: Request): Promise<void> {
 const db = await getDb();
 const profile = await getProfile(userId);
 const rows = await db
 .select({ id: identityNames.id })
 .from(identityNames)
 .where(and(eq(identityNames.id, nameId), eq(identityNames.profileId, profile.id)))
 .limit(1);
 if (!rows[0]) throw notFound();

 await db.delete(identityNames).where(eq(identityNames.id, nameId));
 await touchProfile(profile.id);
 await recordAudit({
 userId,
 action: "vault.name.delete",
 entityType: "identity_name",
 entityId: nameId,
 request,
 });
}

export async function setPrimaryName(userId: string, nameId: string, request: Request): Promise<void> {
 const db = await getDb();
 const profile = await getProfile(userId);
 const rows = await db
 .select({ id: identityNames.id })
 .from(identityNames)
 .where(and(eq(identityNames.id, nameId), eq(identityNames.profileId, profile.id)))
 .limit(1);
 if (!rows[0]) throw notFound();

 await db.transaction(async (tx) => {
 await tx.update(identityNames).set({ isPrimary: 0 }).where(eq(identityNames.profileId, profile.id));
 await tx.update(identityNames).set({ isPrimary: 1 }).where(eq(identityNames.id, nameId));
 });
 await touchProfile(profile.id);
 await recordAudit({
 userId,
 action: "vault.name.primary",
 entityType: "identity_name",
 entityId: nameId,
 request,
 });
}

export async function addAlias(userId: string, input: AddAliasInput, request: Request): Promise<string> {
 const db = await getDb();
 const profile = await getProfile(userId);
 const handle = input.handle.trim();
 const normalized = normalizeHandle(handle);
 if (normalized.length < 2) throw badRequest("Username must be at least 2 characters");

 const id = newId(ID_PREFIXES.alias);
 const now = Date.now();
 try {
 await db.insert(identityAliases).values({
 id,
 profileId: profile.id,
 handle,
 handleNormalized: normalized,
 origin: input.origin,
 platformsJson: JSON.stringify(input.platforms),
 startPeriod: input.startPeriod ?? null,
 endPeriod: input.endPeriod ?? null,
 verification: input.origin === "generated_variant" ? "unverified" : "user_provided",
 notesEnc: input.notes ? encryptField(input.notes, "identity_aliases.notes") : null,
 createdAt: now,
 updatedAt: now,
 });
 } catch (error) {
 if (isUniqueViolation(error)) {
 throw conflict("DUPLICATE_ALIAS", "This username is already saved");
 }
 throw error;
 }

 await touchProfile(profile.id);
 await recordAudit({
 userId,
 action: "vault.alias.create",
 entityType: "identity_alias",
 entityId: id,
 meta: { kind: input.origin },
 request,
 });
 return id;
}

export async function updateAlias(
 userId: string,
 aliasId: string,
 input: UpdateAliasInput,
 request: Request,
): Promise<void> {
 const db = await getDb();
 const profile = await getProfile(userId);
 const rows = await db
 .select({ id: identityAliases.id })
 .from(identityAliases)
 .where(and(eq(identityAliases.id, aliasId), eq(identityAliases.profileId, profile.id)))
 .limit(1);
 if (!rows[0]) throw notFound();

 const patch: Record<string, unknown> = { updatedAt: Date.now() };
 if (input.verification) patch.verification = input.verification;
 if (input.platforms) patch.platformsJson = JSON.stringify(input.platforms);
 if (input.startPeriod !== undefined) patch.startPeriod = input.startPeriod ?? null;
 if (input.endPeriod !== undefined) patch.endPeriod = input.endPeriod ?? null;
 if (input.notes !== undefined) {
 patch.notesEnc = input.notes ? encryptField(input.notes, "identity_aliases.notes") : null;
 }

 await db.update(identityAliases).set(patch).where(eq(identityAliases.id, aliasId));
 await touchProfile(profile.id);
 await recordAudit({
 userId,
 action: "vault.alias.update",
 entityType: "identity_alias",
 entityId: aliasId,
 meta: { changedFields: Object.keys(patch).filter((k) => k !== "updatedAt") },
 request,
 });
}

export async function deleteAlias(userId: string, aliasId: string, request: Request): Promise<void> {
 const db = await getDb();
 const profile = await getProfile(userId);
 const rows = await db
 .select({ id: identityAliases.id })
 .from(identityAliases)
 .where(and(eq(identityAliases.id, aliasId), eq(identityAliases.profileId, profile.id)))
 .limit(1);
 if (!rows[0]) throw notFound();

 await db.delete(identityAliases).where(eq(identityAliases.id, aliasId));
 await touchProfile(profile.id);
 await recordAudit({
 userId,
 action: "vault.alias.delete",
 entityType: "identity_alias",
 entityId: aliasId,
 request,
 });
}

export async function addContact(userId: string, input: ContactInput, request: Request): Promise<string> {
 const db = await getDb();
 const profile = await getProfile(userId);
 const normalized = input.kind === "email" ? normalizeEmail(input.value) : normalizePhone(input.value);
 if (!normalized) throw badRequest("Invalid contact information");

 const id = newId(ID_PREFIXES.contact);
 try {
 await db.insert(identityContacts).values({
 id,
 profileId: profile.id,
 kind: input.kind,
 valueEnc: encryptField(normalized, "identity_contacts.value"),
 valueBidx: blindIndex(input.kind, normalized),
 consentSearch: input.consentSearch ? 1 : 0,
 isPublic: input.isPublic ? 1 : 0,
 verification: "unverified",
 createdAt: Date.now(),
 });
 } catch (error) {
 if (isUniqueViolation(error)) throw conflict("DUPLICATE_CONTACT", "This contact information is already saved");
 throw error;
 }

 await touchProfile(profile.id);
 await recordAudit({
 userId,
 action: "vault.contact.create",
 entityType: "identity_contact",
 entityId: id,
 meta: { kind: input.kind, via: input.consentSearch ? "search_consent" : "no_search_consent" },
 request,
 });
 return id;
}

export async function deleteContact(userId: string, contactId: string, request: Request): Promise<void> {
 const db = await getDb();
 const profile = await getProfile(userId);
 const rows = await db
 .select({ id: identityContacts.id })
 .from(identityContacts)
 .where(and(eq(identityContacts.id, contactId), eq(identityContacts.profileId, profile.id)))
 .limit(1);
 if (!rows[0]) throw notFound();

 await db.delete(identityContacts).where(eq(identityContacts.id, contactId));
 await touchProfile(profile.id);
 await recordAudit({
 userId,
 action: "vault.contact.delete",
 entityType: "identity_contact",
 entityId: contactId,
 request,
 });
}

export async function addLink(userId: string, input: AddLinkInput, request: Request): Promise<string> {
 const db = await getDb();
 const profile = await getProfile(userId);
 const url = assertUrlAllowed(input.url).href;

 const id = newId(ID_PREFIXES.link);
 try {
 await db.insert(identityLinks).values({
 id,
 profileId: profile.id,
 kind: input.kind,
 url,
 label: input.label ?? null,
 verification: "user_provided",
 createdAt: Date.now(),
 });
 } catch (error) {
 if (isUniqueViolation(error)) throw conflict("DUPLICATE_LINK", "This link is already saved");
 throw error;
 }

 await touchProfile(profile.id);
 await recordAudit({
 userId,
 action: "vault.link.create",
 entityType: "identity_link",
 entityId: id,
 meta: { kind: input.kind },
 request,
 });
 return id;
}

export async function deleteLink(userId: string, linkId: string, request: Request): Promise<void> {
 const db = await getDb();
 const profile = await getProfile(userId);
 const rows = await db
 .select({ id: identityLinks.id })
 .from(identityLinks)
 .where(and(eq(identityLinks.id, linkId), eq(identityLinks.profileId, profile.id)))
 .limit(1);
 if (!rows[0]) throw notFound();

 await db.delete(identityLinks).where(eq(identityLinks.id, linkId));
 await touchProfile(profile.id);
 await recordAudit({
 userId,
 action: "vault.link.delete",
 entityType: "identity_link",
 entityId: linkId,
 request,
 });
}

export async function updateScope(userId: string, input: ScopeInput, request: Request): Promise<ScopeView> {
 const db = await getDb();
 const profile = await getProfile(userId);
 const current = await getScope(profile.id);
 const now = Date.now();

 await db.transaction(async (tx) => {
 await tx
 .update(researchScopes)
 .set({
 mode: input.mode,
 depth: input.depth,
 platformsJson: JSON.stringify(input.platforms),
 searchName: input.searchName ? 1 : 0,
 searchAliases: input.searchAliases ? 1 : 0,
 searchContacts: input.searchContacts ? 1 : 0,
 maxQueries: input.maxQueries,
 maxDepth: input.maxDepth,
 maxCostCents: input.maxCostCents,
 updatedAt: now,
 })
 .where(eq(researchScopes.id, current.id));

 const activeRows = await tx
 .select()
 .from(consentRecords)
 .where(
 and(
 eq(consentRecords.userId, userId),
 eq(consentRecords.scope, "contacts_search"),
 isNull(consentRecords.revokedAt),
 ),
 )
 .orderBy(desc(consentRecords.createdAt))
 .limit(1);
 const active = activeRows[0];

 if (input.searchContacts && !active) {
 await tx.insert(consentRecords).values({
 id: newId(ID_PREFIXES.consent),
 userId,
 scope: "contacts_search",
 granted: 1,
 policyVersion: POLICY_VERSION,
 createdAt: now,
 });
 } else if (!input.searchContacts && active) {
 await tx
 .update(consentRecords)
 .set({ revokedAt: now })
 .where(eq(consentRecords.id, active.id));
 }
 });

 await touchProfile(profile.id);
 await recordAudit({
 userId,
 action: "vault.scope.update",
 entityType: "research_scope",
 entityId: current.id,
 meta: { mode: input.mode, depth: input.depth, platform: input.platforms.join(",") },
 request,
 });

 const updated = await getScope(profile.id);
 return {
 id: updated.id,
 mode: updated.mode,
 depth: updated.depth,
 platforms: parseStringArray(updated.platformsJson),
 searchName: updated.searchName === 1,
 searchAliases: updated.searchAliases === 1,
 searchContacts: updated.searchContacts === 1,
 maxQueries: updated.maxQueries,
 maxDepth: updated.maxDepth,
 maxCostCents: updated.maxCostCents,
 };
}

export async function declareOwnership(userId: string, request: Request): Promise<void> {
 const db = await getDb();
 const profile = await getProfile(userId);
 const now = Date.now();
 await db.transaction(async (tx) => {
 await tx
 .update(identityProfiles)
 .set({ ownerDeclared: 1, ownerDeclaredAt: now, updatedAt: now })
 .where(eq(identityProfiles.id, profile.id));
 await tx.insert(consentRecords).values({
 id: newId(ID_PREFIXES.consent),
 userId,
 scope: "ownership_declaration",
 granted: 1,
 policyVersion: POLICY_VERSION,
 createdAt: now,
 });
 });
 await recordAudit({
 userId,
 action: "vault.ownership.declare",
 entityType: "identity_profile",
 entityId: profile.id,
 request,
 });
}

export type ExportPayload = {
 schemaVersion: number;
 exportedAt: string;
 user: { id: string; email: string | null; displayName: string | null; createdAt: number };
 profile: VaultView["profile"];
 names: Array<{ kind: string; value: string; isPrimary: boolean; notes: string | null }>;
 aliases: Array<Omit<VaultView["aliases"][number], "id">>;
 contacts: Array<{ kind: string; value: string; consentSearch: boolean; isPublic: boolean }>;
 links: Array<{ kind: string; url: string; label: string | null }>;
 scope: ScopeView;
 consents: Array<{ scope: string; granted: boolean; createdAt: number }>;
 variants: VaultView["variants"];
 searchHistory: Array<{
 fieldType: string;
 query: string;
 queryMasked: string;
 status: string;
 createdAt: number;
 finishedAt: number | null;
 checkedCount: number;
 foundCount: number;
 hiddenCount: number;
 blockedCount: number;
 errorCount: number;
 results: Array<{
 platformId: string;
 platformName: string;
 profileUrl: string;
 handle: string;
 confidence: number;
 verification: string;
 evidence: Record<string, unknown>;
 }>;
 }>;
 audit: Array<{
 action: string;
 outcome: string;
 entityType: string | null;
 createdAt: number;
 meta: Record<string, unknown>;
 }>;
 limitations: string[];
};

export async function exportUserData(userId: string): Promise<ExportPayload> {
 const db = await getDb();
 const vault = await getVault(userId);
 const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
 const user = userRows[0];
 if (!user) throw notFound("User not found");

 const contactRows = await db
 .select()
 .from(identityContacts)
 .where(eq(identityContacts.profileId, vault.profile.id));

 const auditRows = await db
 .select()
 .from(auditEvents)
 .where(eq(auditEvents.userId, userId))
 .orderBy(desc(auditEvents.createdAt));

 const runRows = await db
 .select()
 .from(searchRuns)
 .where(eq(searchRuns.userId, userId))
 .orderBy(desc(searchRuns.createdAt));
 const runIds = runRows.map((run) => run.id);
 const resultRows = runIds.length
 ? await db
 .select()
 .from(searchResults)
 .where(inArray(searchResults.runId, runIds))
 .orderBy(desc(searchResults.createdAt))
 : [];
 const resultsByRun = new Map<string, ExportPayload["searchHistory"][number]["results"]>();
 for (const row of resultRows) {
 const list = resultsByRun.get(row.runId) ?? [];
 list.push({
 platformId: row.platformId,
 platformName: row.platformName,
 profileUrl: row.profileUrl,
 handle: row.handle,
 confidence: row.confidence,
 verification: row.verification,
 evidence: parseJsonObject(row.evidenceJson),
 });
 resultsByRun.set(row.runId, list);
 }

 return {
 schemaVersion: 2,
 exportedAt: new Date().toISOString(),
 user: {
 id: user.id,
 email: revealDecrypted(user.emailEnc, "users.email"),
 displayName: user.displayNameEnc ? revealDecrypted(user.displayNameEnc, "users.display_name") : null,
 createdAt: user.createdAt,
 },
 profile: vault.profile,
 names: vault.names.map((n) => ({
 kind: n.kind,
 value: n.value,
 isPrimary: n.isPrimary,
 notes: n.notes,
 })),
 aliases: vault.aliases.map((a) => ({
 handle: a.handle,
 origin: a.origin,
 platforms: a.platforms,
 startPeriod: a.startPeriod,
 endPeriod: a.endPeriod,
 verification: a.verification,
 notes: a.notes,
 createdAt: a.createdAt,
 })),
 contacts: contactRows.map((row) => ({
 kind: row.kind,
 value: revealDecrypted(row.valueEnc, "identity_contacts.value") ?? "",
 consentSearch: row.consentSearch === 1,
 isPublic: row.isPublic === 1,
 })),
 links: vault.links.map((l) => ({ kind: l.kind, url: l.url, label: l.label })),
 scope: vault.scope,
 consents: vault.consents,
 variants: vault.variants,
 searchHistory: runRows.map((run) => ({
 fieldType: run.fieldType,
 query: revealDecrypted(run.queryEnc, "search_runs.query") ?? run.queryMasked,
 queryMasked: run.queryMasked,
 status: run.status,
 createdAt: run.createdAt,
 finishedAt: run.finishedAt,
 checkedCount: run.checkedCount,
 foundCount: run.foundCount,
 hiddenCount: run.hiddenCount,
 blockedCount: run.blockedCount,
 errorCount: run.errorCount,
 results: resultsByRun.get(run.id) ?? [],
 })),
 audit: auditRows.map((row) => ({
 action: row.action,
 outcome: row.outcome,
 entityType: row.entityType,
 createdAt: row.createdAt,
 meta: parseJsonObject(row.metaJson),
 })),
 limitations: [
 "This export contains only data stored within Social Cleaner.",
 "Search history includes stored platform outcomes and evidence captured at scan time.",
 "Variants are search hypotheses, not evidence.",
 ],
 };
}

function revealDecrypted(payload: string, aad: string): string | null {
 try {
 return decryptField(payload, aad);
 } catch {
 return null;
 }
}

function parseJsonObject(raw: string): Record<string, unknown> {
 try {
 const value: unknown = JSON.parse(raw);
 return value && typeof value === "object" && !Array.isArray(value)
 ? (value as Record<string, unknown>)
 : {};
 } catch {
 return {};
 }
}

export async function deleteUserAccount(userId: string, request: Request): Promise<void> {
 const db = await getDb();
 await recordAudit({
 userId,
 action: "account.delete",
 entityType: "user",
 entityId: userId,
 request,
 });
 await db.delete(users).where(eq(users.id, userId));
}

export type AuditPage = {
 events: Array<{
 id: string;
 action: string;
 entityType: string | null;
 outcome: string;
 createdAt: number;
 meta: Record<string, unknown>;
 }>;
 nextCursor: number | null;
};

export async function listAuditEvents(userId: string, limit = 50, cursor?: number): Promise<AuditPage> {
 const db = await getDb();
 const safeLimit = Math.min(Math.max(limit, 1), 100);
 const where = cursor
 ? and(eq(auditEvents.userId, userId), lt(auditEvents.createdAt, cursor))
 : eq(auditEvents.userId, userId);

 const rows: AuditEventRow[] = await db
 .select()
 .from(auditEvents)
 .where(where)
 .orderBy(desc(auditEvents.createdAt))
 .limit(safeLimit + 1);

 const hasMore = rows.length > safeLimit;
 const page = rows.slice(0, safeLimit);
 return {
 events: page.map((row) => ({
 id: row.id,
 action: row.action,
 entityType: row.entityType,
 outcome: row.outcome,
 createdAt: row.createdAt,
 meta: parseJsonObject(row.metaJson),
 })),
 nextCursor: hasMore ? (page[page.length - 1]?.createdAt ?? null) : null,
 };
}

export const CONSENT_SCOPE_LABELS: Record<string, string> = {
 ownership_declaration: "Identity ownership declaration",
 contacts_search: "Search by contact information",
 automated_removal: "Automated removal request",
 monitoring: "Periodic monitoring",
};

export { CONSENT_SCOPES, POLICY_VERSION };
