// F10 foundation request boundary. Genuine native Portal facts/current-proof
// helpers remain required before ALLOW; this code issues no cookie or grant.
import 'server-only';
import {workspaceMode} from '../workspace-routing/config.server';
import {headers} from "next/headers";
import {workspaceCookies as cookies} from "@/lib/workspace-routing/cookies.server";
import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';
import { normalizeWorkspaceLocator } from '../tenancy/identity';
import { resolvePortalRequestProof } from '../tenancy/resolve.server';
import { createTenantExecutor } from '../tenancy/executor.server';
import { tenantBatch, workspaceSnapshot, portalEmploymentSnapshot } from '../tenancy/query-contract';
import type { WorkspaceSnapshot, PortalEmploymentSnapshot } from '../tenancy/query-contract';
import type { PortalProof } from '../tenancy/types';

export type SelectedPortalRequest = Readonly<{
  status: 'ALLOW'; proof: PortalProof;
  workspace: WorkspaceSnapshot; employment: PortalEmploymentSnapshot;
}> | Readonly<{ status: 'DENY' }> | Readonly<{ status: 'UNAVAILABLE' }>;
const DENY = Object.freeze({ status: 'DENY' as const });
const UNAVAILABLE = Object.freeze({ status: 'UNAVAILABLE' as const });

function unambiguousSessionCookie(raw: string | null): boolean {
  if (typeof raw !== 'string') return false;
  let count = 0;
  // Next's RequestCookies coalesces duplicate names into one Map entry. Check
  // multiplicity on this request's original header before using its cookie API.
  // Only names are inspected here; the bearer still comes exclusively from
  // cookies(). Include malformed/whitespace variants in ambiguity rejection.
  for (const field of raw.split(';')) {
    const equals = field.indexOf('=');
    const name = (equals === -1 ? field : field.slice(0, equals)).trim();
    if (name === 'fuel_session' && (equals === -1 || ++count !== 1)) return false;
  }
  return count === 1;
}

function sessionBearer(value: unknown): string | null {
  // getAll is the actual request-owned Next cookie API. Refuse ambiguous cookie
  // names instead of silently selecting a first/last duplicate. Cookie header
  // data does not prove HttpOnly; that attribute belongs to the cookie issuer.
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype) return null;
  const array = Object.getOwnPropertyDescriptors(value as object);
  if (Reflect.ownKeys(array).length !== 2 || !Object.hasOwn(array, 'length') ||
    !Object.hasOwn(array.length, 'value') || array.length.value !== 1 ||
    !Object.hasOwn(array, '0') || !Object.hasOwn(array[0], 'value')) return null;
  const cookie: unknown = array[0].value;
  if (!cookie || typeof cookie !== 'object' || nodeTypes.isProxy(cookie) || Array.isArray(cookie)) return null;
  const prototype = Object.getPrototypeOf(cookie);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const data = Object.getOwnPropertyDescriptors(cookie);
  if (Reflect.ownKeys(data).length !== 2 || !Object.hasOwn(data, 'name') || !Object.hasOwn(data, 'value') ||
    !Object.hasOwn(data.name, 'value') || !Object.hasOwn(data.value, 'value') ||
    !data.name.enumerable || !data.value.enumerable || data.name.value !== 'fuel_session') return null;
  const bearer: unknown = data.value.value;
  // Match the existing session generator: 32 bytes, unpadded canonical
  // base64url. No trim, Unicode replacement, coercion or caller digest seam.
  if (typeof bearer !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(bearer)) return null;
  const decoded = Buffer.from(bearer, 'base64url');
  return decoded.length === 32 && decoded.toString('base64url') === bearer ? bearer : null;
}

/** Server-only. The actual route supplies its request-owned selected locator;
 * it is an untrusted nonsecret selector, never a workspace grant. No selector
 * is inferred from global configuration, employee ID, primary location or old
 * session DTO. The only bearer input is this request's Next cookie store.
 * Returned proof stays private server state; serializing it grants nothing. */
export async function resolveSelectedPortalRequest(selectedLocator: unknown): Promise<SelectedPortalRequest> {
  // Held shared-database Phase F protocol cannot select an isolated company.
  // Isolated clients use registered-host discovery and normal bound auth.
  try{if(workspaceMode()==='isolated')return UNAVAILABLE;}catch{return UNAVAILABLE;}
  const locator = normalizeWorkspaceLocator(selectedLocator);
  if (locator === null) return DENY;
  try {
    if (!unambiguousSessionCookie((await headers()).get('cookie'))) return DENY;
    const store = await cookies();
    const bearer = sessionBearer(store.getAll('fuel_session'));
    if (bearer === null) return DENY;
    const digest = createHash('sha256').update(bearer, 'utf8').digest('hex');
    const resolution = await resolvePortalRequestProof(locator, digest);
    if (resolution.status !== 'ALLOW') return resolution;
    const proof = resolution.proof;
    // Both closed statements and their bindings originate in that exact private
    // proof. One owning executor batch performs current locks/final checks;
    // no standalone raw query, plain receipt promotion, fallback or replay.
    const [workspace, employment] = await createTenantExecutor(proof).transaction(
      tenantBatch(proof, [workspaceSnapshot(proof), portalEmploymentSnapshot(proof)] as const),
    );
    return Object.freeze({ status: 'ALLOW' as const, proof, workspace, employment });
  } catch { return UNAVAILABLE; }
}
