import { z } from "zod";
import { handleApi, jsonResponse, noContent, notFound, readJson } from "@/server/http/errors";
import { requireMutationAuth, requireSession } from "@/server/auth/guard";
import { limitMutation } from "@/server/api/limits";
import { ID_PREFIXES, isValidId } from "@/server/ids";
import {
 addAlias,
 addContact,
 addLink,
 addName,
 declareOwnership,
 deleteAlias,
 deleteContact,
 deleteLink,
 deleteName,
 getVault,
 setPrimaryName,
 updateAlias,
 updateScope,
} from "@/server/vault/service";
import {
 addAliasSchema,
 addLinkSchema,
 addNameSchema,
 contactSchema,
 ownershipSchema,
 scopeSchema,
 updateAliasSchema,
} from "@/server/vault/schemas";

function assertId(id: string, prefix: (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES]): void {
 if (!isValidId(id, prefix)) throw notFound();
}

export function getVaultRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireSession(request);
 return jsonResponse(await getVault(authed.user.id));
 });
}

export function getVariantsRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireSession(request);
 const vault = await getVault(authed.user.id);
 return jsonResponse(vault.variants);
 });
}

export function createNameRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 const input = await readJson(request, addNameSchema);
 const id = await addName(authed.user.id, input, request);
 return jsonResponse({ ok: true, id }, { status: 201 });
 });
}

export function deleteNameRoute(request: Request, id: string): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 assertId(id, ID_PREFIXES.name);
 await deleteName(authed.user.id, id, request);
 return noContent();
 });
}

export function setPrimaryNameRoute(request: Request, id: string): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 assertId(id, ID_PREFIXES.name);
 await readJson(request, z.object({ isPrimary: z.literal(true) }));
 await setPrimaryName(authed.user.id, id, request);
 return jsonResponse({ ok: true });
 });
}

export function createAliasRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 const input = await readJson(request, addAliasSchema);
 const id = await addAlias(authed.user.id, input, request);
 return jsonResponse({ ok: true, id }, { status: 201 });
 });
}

export function updateAliasRoute(request: Request, id: string): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 assertId(id, ID_PREFIXES.alias);
 const input = await readJson(request, updateAliasSchema);
 await updateAlias(authed.user.id, id, input, request);
 return jsonResponse({ ok: true });
 });
}

export function deleteAliasRoute(request: Request, id: string): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 assertId(id, ID_PREFIXES.alias);
 await deleteAlias(authed.user.id, id, request);
 return noContent();
 });
}

export function createContactRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 const input = await readJson(request, contactSchema);
 const id = await addContact(authed.user.id, input, request);
 return jsonResponse({ ok: true, id }, { status: 201 });
 });
}

export function deleteContactRoute(request: Request, id: string): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 assertId(id, ID_PREFIXES.contact);
 await deleteContact(authed.user.id, id, request);
 return noContent();
 });
}

export function createLinkRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 const input = await readJson(request, addLinkSchema);
 const id = await addLink(authed.user.id, input, request);
 return jsonResponse({ ok: true, id }, { status: 201 });
 });
}

export function deleteLinkRoute(request: Request, id: string): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 assertId(id, ID_PREFIXES.link);
 await deleteLink(authed.user.id, id, request);
 return noContent();
 });
}

export function updateScopeRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 const input = await readJson(request, scopeSchema);
 const scope = await updateScope(authed.user.id, input, request);
 return jsonResponse({ ok: true, scope });
 });
}

export function declareOwnershipRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 await readJson(request, ownershipSchema);
 await declareOwnership(authed.user.id, request);
 return jsonResponse({ ok: true });
 });
}
