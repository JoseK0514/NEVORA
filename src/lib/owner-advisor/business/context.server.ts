import 'server-only';
import type { SqlStatement } from '@/lib/notifications/types';
import { readFeatureFlags } from '@/lib/feature-flags';
import { AdvisorError } from '../contracts';
import type { AdvisorStore } from '../store.server';
import { captureOwnerInvestigationContext, ownerInvestigationContextGuards, type OwnerInvestigationContext, type OwnerInvestigationOrigin } from '../owner-investigation-context.server';
import { BusinessStore } from './store.server';
export type BusinessContext = OwnerInvestigationContext;
export type BusinessOrigin = OwnerInvestigationOrigin;
export type BusinessSnapshot = { fingerprint: string; evidenceRevision: number; observedAt: string };
export const businessFlags = (env: Record<string,string|undefined>) => { const flags=readFeatureFlags(env); return {parent:flags.ownerAdvisor,imports:flags.ownerAdvisorBusinessImports,retrieval:flags.ownerAdvisorBusinessRetrieval}; };
export const captureBusinessContext = (advisor: AdvisorStore, origin: BusinessOrigin | undefined, env: Record<string,string|undefined>, signal: AbortSignal) => captureOwnerInvestigationContext(advisor, env, origin, signal);
export const businessContextGuards = ownerInvestigationContextGuards;
/** Drafts and administration revisions deliberately do not participate. Active
 * pointers, immutable digests, the published map and current location set do. */
export const businessFingerprintSql = `md5(jsonb_build_object(
 'epoch',COALESCE((SELECT evidence_revision FROM owner_advisor_business_state WHERE workspace_id=$1),0),
 'windows',COALESCE((SELECT jsonb_agg(jsonb_build_array(s.source_id,s.domain,s.namespace,s.currency,v.version_id,v.digest,v.time_zone,x.from_at,x.to_at) ORDER BY s.source_id,x.from_at)
  FROM owner_advisor_business_windows x JOIN owner_advisor_business_sources s USING(workspace_id,source_id)
  JOIN owner_advisor_business_versions v ON v.workspace_id=x.workspace_id AND v.source_id=x.source_id AND v.version_id=x.version_id
  WHERE x.workspace_id=$1 AND s.active AND NOT s.deleted AND v.status='PUBLISHED' AND v.payload IS NOT NULL),'[]'),
 'map',COALESCE((SELECT jsonb_agg(jsonb_build_array(map_version_id,digest) ORDER BY map_version_id) FROM owner_advisor_business_maps WHERE workspace_id=$1 AND current AND status='PUBLISHED' AND payload IS NOT NULL),'[]'),
 'locations',COALESCE((SELECT jsonb_agg(jsonb_build_array(id,name) ORDER BY id) FROM locations WHERE workspace_id=$1 AND active),'[]'))::text)`;
export async function captureBusinessSnapshot(store: BusinessStore, signal: AbortSignal): Promise<BusinessSnapshot> {
  const [row] = await store.guarded<{ fingerprint: string; epoch: number; at: string }>({ text: `SELECT ${businessFingerprintSql} AS fingerprint,COALESCE((SELECT evidence_revision::float8 FROM owner_advisor_business_state WHERE workspace_id=$1),0) AS epoch,clock_timestamp()::text AS at`, values: [store.workspaceId] }, signal);
  if (!row || !/^[a-f0-9]{32}$/.test(row.fingerprint)) throw new AdvisorError('unavailable');
  return { fingerprint: row.fingerprint, evidenceRevision: row.epoch, observedAt: new Date(row.at).toISOString() };
}
export function businessSnapshotGuards(store: BusinessStore, snapshot: BusinessSnapshot, expiresAt: string): SqlStatement[] {
  if (!/^[a-f0-9]{32}$/.test(snapshot.fingerprint) || !Number.isFinite(Date.parse(expiresAt))) throw new AdvisorError('conflict');
  return [{ text: `SELECT(CASE WHEN ${businessFingerprintSql}=$2 AND $3::timestamptz>clock_timestamp() THEN '1' ELSE 'advisor_business_source_changed' END)::integer`, values: [store.workspaceId, snapshot.fingerprint, expiresAt] }];
}
