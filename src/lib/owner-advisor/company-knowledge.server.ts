import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import type { SqlExecutor } from '@/lib/notifications/types';
import { AdvisorError, record } from './contracts';
import { AdvisorStore } from './store.server';
import { admitOwner, ownerGuards } from './authority.server';
import { knowledgeDigest, knowledgeUuid, parseKnowledgeCommand, type CompanyProfile, type KnowledgeFence, type KnowledgeValidity } from './company-knowledge';
import { knowledgeFenceGuards } from './company-knowledge-fence.server';

export type KnowledgeVersion = KnowledgeValidity & {
  documentId: string; versionId: string; kind: 'profile' | 'document'; title: string; locale: 'en' | 'es'; category: string;
  body: string; profileFields: CompanyProfile | null; sourceName: string | null; textDigest: string;
  createdAt: string; publishedAt: string | null; current: boolean; archived: boolean;
};
export type ActiveKnowledgeVersion = Pick<KnowledgeVersion, 'documentId' | 'versionId' | 'kind' | 'title' | 'locale' | 'category' | 'textDigest'> & KnowledgeValidity & { publishedAt: string; reviewOverdue: boolean };
export type KnowledgeLease = KnowledgeFence & { observedAt: string; activeVersions: ActiveKnowledgeVersion[] };
export type KnowledgeReceipt = { state: 'draft_saved' | 'published' | 'archived' | 'deleted'; operationId: string; documentId: string; versionId?: string; textDigest?: string; revision: number; savedAt: string };
export type KnowledgeSnapshot = { state: 'ready'; revision: number; entries: { documentId: string; kind: string; archived: boolean; deleted: boolean; publishedVersionId: string | null; versions: Record<string, unknown>[] }[] };
function failure(error: unknown): never {
  if (error instanceof AdvisorError) throw error;
  if (record(error) && typeof error.message === 'string' && /company_knowledge_limit/.test(error.message)) throw new AdvisorError('limit');
  if (record(error) && typeof error.message === 'string' && /company_knowledge_conflict|advisor_knowledge_changed/.test(error.message)) throw new AdvisorError('conflict');
  throw error;
}
async function available(store: AdvisorStore) {
  const [row] = await store.transaction<{ available: boolean }>({ text: "SELECT to_regclass('owner_advisor_company_knowledge_state') IS NOT NULL AS available", values: [] });
  if (!row?.available) throw new AdvisorError('unavailable');
}
export async function assertKnowledgeFence(store: AdvisorStore, fence: KnowledgeFence) {
  try { await store.ex.transaction([...knowledgeFenceGuards(store.original.workspace.id, fence), ...ownerGuards(store.proof, store.original)]); } catch (error) { failure(error); }
}
export async function companyKnowledgeService(proof: SessionMutationProof, ex: SqlExecutor, signal: AbortSignal, value?: unknown): Promise<KnowledgeSnapshot | KnowledgeReceipt> {
  signal.throwIfAborted();
  const store = new AdvisorStore(proof, await admitOwner(proof, ex), ex);
  await available(store);
  if (value === undefined) {
    const [snapshot] = await store.transaction<{ snapshot: KnowledgeSnapshot }>({ text: `SELECT jsonb_build_object('state','ready','revision',coalesce((SELECT revision FROM owner_advisor_company_knowledge_state WHERE workspace_id=$1),0),'entries',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'documentId',e.id,'kind',e.kind,'archived',e.archived_at IS NOT NULL,'deleted',e.deleted_at IS NOT NULL,'publishedVersionId',e.published_version,
      'versions',(SELECT coalesce(jsonb_agg(jsonb_build_object('versionId',v.id,'title',v.title,'locale',v.locale,'category',v.category,'sourceName',v.source_name,'textDigest',v.text_digest,'createdAt',v.created_at,'publishedAt',v.published_at,'effectiveFrom',v.effective_from,'effectiveUntil',v.effective_until,'reviewDue',v.review_due) ORDER BY v.created_at,v.id),'[]'::jsonb) FROM owner_advisor_company_knowledge_versions v WHERE v.workspace_id=e.workspace_id AND v.document_id=e.id)) ORDER BY e.created_at,e.id) FROM owner_advisor_company_knowledge_entries e WHERE e.workspace_id=$1 AND e.deleted_at IS NULL),'[]'::jsonb)) AS snapshot`, values: [store.original.workspace.id] }, signal);
    return snapshot.snapshot;
  }
  const command = parseKnowledgeCommand(value);
  const payload = 'body' in command ? { ...command, textDigest: knowledgeDigest(command.body) } : command;
  const hash = knowledgeDigest(JSON.stringify(command));
  try {
    // Acquire the writer lock before the shared workspace/Owner guards. Two
    // concurrent writers must not both acquire SHARE and then try to upgrade.
    const guards = ownerGuards(proof, store.original);
    const results = await ex.transaction([
      { text: 'SELECT id FROM workspaces WHERE id=$1 FOR NO KEY UPDATE', values: [store.original.workspace.id] }, ...guards,
      { text: 'SELECT owner_advisor_company_knowledge_mutate($1,$2,$3,$4,$5::uuid,$6,$7,$8,$9::jsonb,$10::uuid,$11::uuid) AS result',
        values: [store.original.workspace.id, proof.employee.id, proof.sessionTokenHash, store.original.authority, command.requestId, hash, command.expectedRevision, command.op, JSON.stringify(payload), randomUUID(), randomUUID()] },
      ...ownerGuards(proof, store.original),
    ], signal);
    const [row] = results[guards.length + 1] as { result: KnowledgeReceipt }[];
    return row.result;
  } catch (error) { return failure(error); }
}

export async function readKnowledgeLease(store: AdvisorStore): Promise<KnowledgeLease> {
  await available(store);
  const guards = ownerGuards(store.proof, store.original);
  const result = await store.ex.transaction([
    { text: 'SELECT id FROM workspaces WHERE id=$1 FOR SHARE', values: [store.original.workspace.id] }, ...guards,
    { text: `WITH observed AS (SELECT statement_timestamp() AS at), published AS (
       SELECT e.kind,v.* FROM owner_advisor_company_knowledge_entries e JOIN owner_advisor_company_knowledge_versions v ON v.workspace_id=e.workspace_id AND v.document_id=e.id AND v.id=e.published_version
       WHERE e.workspace_id=$1 AND e.archived_at IS NULL AND e.deleted_at IS NULL AND v.body IS NOT NULL
     ) SELECT coalesce((SELECT revision FROM owner_advisor_company_knowledge_state WHERE workspace_id=$1),0) AS revision,
       observed.at::text AS "observedAt",(SELECT min(t)::text FROM published p CROSS JOIN LATERAL (VALUES(p.effective_from),(p.effective_until),(p.review_due)) transitions(t) WHERE t>observed.at) AS "validUntil",
       coalesce((SELECT jsonb_agg(jsonb_build_object('documentId',p.document_id,'versionId',p.id,'kind',p.kind,'title',p.title,'locale',p.locale,'category',p.category,'textDigest',p.text_digest,'publishedAt',p.published_at,'effectiveFrom',p.effective_from,'effectiveUntil',p.effective_until,'reviewDue',p.review_due,'reviewOverdue',coalesce(p.review_due<observed.at,false)) ORDER BY p.kind DESC,p.document_id)
       FROM published p WHERE (p.effective_from IS NULL OR p.effective_from<=observed.at) AND (p.effective_until IS NULL OR p.effective_until>observed.at)),'[]'::jsonb) AS "activeVersions" FROM observed`, values: [store.original.workspace.id] }, ...ownerGuards(store.proof, store.original),
  ]);
  const row = (result[guards.length + 1] as Omit<KnowledgeLease, 'fingerprint'>[])[0];
  return { ...row, fingerprint: knowledgeDigest(JSON.stringify([row.revision, row.activeVersions.map(v => [v.documentId, v.versionId, v.textDigest, v.reviewOverdue])])) };
}

export async function readKnowledgeVersion(store: AdvisorStore, documentId: string, versionId: string): Promise<KnowledgeVersion> {
  if (!knowledgeUuid(documentId) || !knowledgeUuid(versionId)) throw new AdvisorError('invalid');
  await available(store);
  const [row] = await store.transaction<KnowledgeVersion>({ text: `SELECT e.id::text AS "documentId",v.id::text AS "versionId",e.kind,v.title,v.locale,v.category,v.body,v.profile_fields AS "profileFields",v.source_name AS "sourceName",v.text_digest AS "textDigest",v.created_at::text AS "createdAt",v.published_at::text AS "publishedAt",v.effective_from::text AS "effectiveFrom",v.effective_until::text AS "effectiveUntil",v.review_due::text AS "reviewDue",coalesce(e.published_version=v.id,false) AS current,e.archived_at IS NOT NULL AS archived
    FROM owner_advisor_company_knowledge_entries e JOIN owner_advisor_company_knowledge_versions v ON v.workspace_id=e.workspace_id AND v.document_id=e.id WHERE e.workspace_id=$1 AND e.id=$2::uuid AND v.id=$3::uuid AND e.deleted_at IS NULL AND v.body IS NOT NULL`, values: [store.original.workspace.id, documentId, versionId] });
  if (!row) throw new AdvisorError('forbidden');
  if (knowledgeDigest(row.body) !== row.textDigest) throw new AdvisorError('unavailable');
  return row;
}
