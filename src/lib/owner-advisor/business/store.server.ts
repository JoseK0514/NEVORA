import 'server-only';
import type { SqlStatement } from '@/lib/notifications/types';
import type { AdvisorStore } from '../store.server';
import { ownerGuards } from '../authority.server';
import { AdvisorError } from '../contracts';
import type { BusinessCatalog, BusinessCommand, BusinessMapView, BusinessReceipt, BusinessVersionView } from './contracts';
import { businessDigest } from './digest.server';
import { parseBusinessCsv } from './csv';
import { checkpoint, normalizeBusinessVersion, parseBusinessCommand, parseBusinessMap, uuid } from './parse';
export type BusinessOperation = { state: 'running' | 'completed'; command_hash: string; command_kind: string; receipt: BusinessReceipt | null };
export type BusinessInspection = { inspection_id: string; query_hash: string; authority: string; session_hash: string; context: unknown; fence: unknown; result: string | null; state: string; expires_at: string };
export function businessFailure(error: unknown): never {
  if (error instanceof AdvisorError) throw error;
  const e = error as { message?: string; code?: string };
  if (/advisor_business_limit/.test(e?.message ?? '')) throw new AdvisorError('limit');
  if (/advisor_business_forbidden/.test(e?.message ?? '')) throw new AdvisorError('forbidden');
  if (/advisor_business_|advisor_weekly_|advisor_knowledge_changed|generation_source_conflict/.test(e?.message ?? '') || ['23505', '40001', '40P01'].includes(e?.code ?? '')) throw new AdvisorError('conflict');
  if (['55P03', '57014'].includes(e?.code ?? '')) throw new AdvisorError('busy');
  if (['42P01', '42883'].includes(e?.code ?? '')) throw new AdvisorError('unavailable');
  throw error;
}
export class BusinessStore {
  constructor(readonly advisor: AdvisorStore, readonly env: Record<string, string | undefined>) {}
  get workspaceId() { return this.advisor.original.workspace.id; }
  get ownerId() { return this.advisor.proof.employee.id; }
  owner() { return ownerGuards(this.advisor.proof, this.advisor.original); }
  writeGuards(): SqlStatement[] {
    return [{ text: "SET LOCAL lock_timeout='1500ms'", values: [] }, { text: "SET LOCAL statement_timeout='5000ms'", values: [] },
      { text: 'SELECT id FROM workspaces WHERE id=$1 FOR NO KEY UPDATE', values: [this.workspaceId] }, ...this.owner(),
      { text: "SELECT pg_advisory_xact_lock(hashtextextended('owner-business:'||$1,0))", values: [this.workspaceId] }];
  }
  async guarded<T>(statement: SqlStatement, signal: AbortSignal, extra: SqlStatement[] = [], after: SqlStatement[] = []): Promise<T[]> {
    checkpoint(signal); const guards = [...this.writeGuards(), ...extra];
    try { const results = await this.advisor.ex.transaction([...guards, statement, ...after, ...this.owner()], signal); checkpoint(signal); return results[guards.length] as T[]; } catch (error) { businessFailure(error); }
  }
  async available(signal: AbortSignal): Promise<void> {
    const [row] = await this.guarded<{ available: boolean }>({ text: "SELECT to_regclass('owner_advisor_business_sources') IS NOT NULL AND to_regclass('owner_advisor_business_inspections') IS NOT NULL AND to_regprocedure('owner_business_execute(text,text,uuid,text,text,text,jsonb,text,text,jsonb,text,timestamp with time zone)') IS NOT NULL AS available", values: [] }, signal);
    if (!row?.available) throw new AdvisorError('unavailable');
  }
  async catalog(signal: AbortSignal, options: { includeLocations?: boolean } = {}): Promise<BusinessCatalog> {
    await this.available(signal);
    const [raw] = await this.guarded<{ state: { revision: number; evidenceRevision: number; mapRevision: number } | null; sources: BusinessCatalog['sources']; versions: BusinessVersionView[]; maps: (Omit<BusinessMapView, 'input'> & { payload: string | null })[]; locations: string[] }>({
      text: `SELECT (SELECT jsonb_build_object('revision',revision,'evidenceRevision',evidence_revision,'mapRevision',map_revision) FROM owner_advisor_business_state WHERE workspace_id=$1) AS state,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('sourceId',source_id,'revision',revision,'name',name,'domain',domain,'namespace',namespace,'currency',currency,'scale',scale,'maxAgeMinutes',max_age_minutes,'active',active,'deleted',deleted) ORDER BY source_id) FROM owner_advisor_business_sources WHERE workspace_id=$1 AND NOT deleted),'[]') AS sources,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('sourceId',v.source_id,'versionId',v.version_id,'timeZone',time_zone,'digest',digest,'status',status,'current',EXISTS(SELECT 1 FROM owner_advisor_business_windows x WHERE x.workspace_id=v.workspace_id AND x.version_id=v.version_id),'input',NULL,'publishEligible',owner_id=$2 AND status='DRAFT' AND completeness='COMPLETE' AND time_zone=(SELECT time_zone FROM workspaces WHERE id=$1),'publishedAt',CASE WHEN published_at IS NULL THEN NULL ELSE to_char(published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,'metadata',jsonb_build_object('window',jsonb_build_object('fromAt',to_char(from_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'toAt',to_char(to_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'sourceAsOf',to_char(source_as_of AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'completeness',completeness,'rowCount',row_count,'payloadBytes',payload_bytes)) ORDER BY v.version_id) FROM owner_advisor_business_versions v WHERE workspace_id=$1 AND payload IS NOT NULL),'[]') AS versions,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('mapVersionId',map_version_id,'digest',digest,'status',status,'current',current,'payload',CASE WHEN current THEN payload ELSE NULL END) ORDER BY map_version_id) FROM owner_advisor_business_maps WHERE workspace_id=$1 AND payload IS NOT NULL),'[]') AS maps,
       COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM (SELECT id FROM locations WHERE $3::boolean AND workspace_id=$1 AND active ORDER BY id LIMIT 10001) active_locations),'[]') AS locations`, values: [this.workspaceId, this.ownerId, options.includeLocations !== false],
    }, signal);
    if (!raw || raw.locations.length > 10000 || Buffer.byteLength(JSON.stringify(raw)) > 2*1024*1024) throw new AdvisorError('limit');
    const versions = raw.versions;
    const sources = raw.sources.map(s => ({ ...s, scopeDigest: businessDigest({ sourceId: s.sourceId, revision: s.revision, versions: versions.filter(v => v.sourceId === s.sourceId).map(v => ({ versionId: v.versionId, digest: v.digest, status: v.status, current: v.current })) }) }));
    return { revision: raw.state?.revision ?? 0, evidenceRevision: raw.state?.evidenceRevision ?? 0, mapRevision: raw.state?.mapRevision ?? 0, timeZone: this.advisor.original.workspace.timeZone,
      activeLocationIds: raw.locations, sources, versions, maps: raw.maps.map(({ payload, ...m }) => ({ ...m, input: payload ? (() => { const input = parseBusinessMap(JSON.parse(payload)); if (businessDigest(input) !== m.digest) throw new AdvisorError('conflict'); return input; })() : null })) };
  }
  /** Metadata count/UTF-8 admission precedes fetching any full record payload. */
  async materialize(catalog: BusinessCatalog, ids: string[], signal: AbortSignal): Promise<BusinessCatalog> {
    const unique = [...new Set(ids)]; const selected = catalog.versions.filter(v => unique.includes(v.versionId));
    if (unique.length !== selected.length || selected.some(v => !v.metadata) || selected.reduce((n, v) => n + v.metadata!.rowCount, 0) > 100000 || Buffer.byteLength(JSON.stringify(catalog)) + selected.reduce((n, v) => n + v.metadata!.payloadBytes, 0) > 2 * 1024 * 1024) throw new AdvisorError('limit');
    const rows = await this.guarded<{ version_id: string; payload: string | null }>({ text: 'SELECT version_id,payload FROM owner_advisor_business_versions WHERE workspace_id=$1 AND version_id=ANY($2::uuid[]) ORDER BY version_id', values: [this.workspaceId, unique] }, signal);
    if (rows.some(r => !r.payload) || rows.length !== unique.length) throw new AdvisorError('conflict');
    return { ...catalog, versions: catalog.versions.map(v => { const row = rows.find(r => r.version_id === v.versionId); if (!row?.payload) return v;
      const input = normalizeBusinessVersion(JSON.parse(row.payload), signal); if (businessDigest(input) !== v.digest) throw new AdvisorError('conflict'); return { ...v, input }; }) };
  }
  async reserveOperation(command: BusinessCommand, hash: string, signal: AbortSignal): Promise<BusinessOperation> {
    if (businessDigest(command) !== hash) throw new AdvisorError('conflict'); await this.available(signal);
    await this.guarded({ text: `SELECT (CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_business_operations WHERE workspace_id=$1 AND request_id=$2::uuid)
      OR (SELECT count(*) FROM owner_advisor_business_operations WHERE workspace_id=$1)+(SELECT count(*) FROM owner_advisor_business_inspections WHERE workspace_id=$1)<10000 THEN '1' ELSE 'advisor_business_limit' END)::integer`, values: [this.workspaceId, command.requestId] }, signal, [], [{ text: 'INSERT INTO owner_advisor_business_operations(workspace_id,owner_id,request_id,command_kind,command_hash) VALUES($1,$2,$3::uuid,$4,$5) ON CONFLICT(workspace_id,request_id) DO NOTHING', values: [this.workspaceId, this.ownerId, command.requestId, command.op, hash] }]);
    const existing = await this.readOperation(command.requestId, signal); if (existing.command_hash !== hash || existing.command_kind !== command.op) throw new AdvisorError('conflict'); return existing;
  }
  async readOperation(id: string, signal: AbortSignal): Promise<BusinessOperation> {
    const [row] = await this.guarded<BusinessOperation>({ text: 'SELECT state,command_hash,command_kind,receipt FROM owner_advisor_business_operations WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3::uuid', values: [this.workspaceId, this.ownerId, uuid(id)] }, signal);
    if (!row) throw new AdvisorError('forbidden'); return row;
  }
  async execute(command: BusinessCommand, hash: string, signal: AbortSignal, options: { contextDigest?: string; validUntil?: string | null; before?: SqlStatement[]; after?: SqlStatement[] } = {}): Promise<BusinessReceipt> {
    command = parseBusinessCommand(command); if (businessDigest(command) !== hash) throw new AdvisorError('conflict');
    const execution: BusinessCommand = command.op === 'stage_source_version' && command.format === 'CSV' ? { op: command.op, requestId: command.requestId, format: 'JSON', input: parseBusinessCsv(command.csv, command.mapping, command.metadata, signal) } : command;
    const payload = execution.op === 'stage_source_version' && execution.format === 'JSON' ? execution.input : execution.op === 'stage_coverage_map' ? execution.map : null;
    let digest = payload ? businessDigest(payload) : null;
    if (command.op === 'withdraw_source' || command.op === 'delete_source') digest = (await this.catalog(signal, { includeLocations: false })).sources.find(s => s.sourceId === command.sourceId)?.scopeDigest ?? null;
    const records = execution.op === 'stage_source_version' && execution.format === 'JSON' ? execution.input.records.map(r => ({ recordId: r.recordId, revision: r.revision, digest: businessDigest(r) })) : [];
    const [row] = await this.guarded<{ receipt: BusinessReceipt }>({ text: 'SELECT owner_business_execute($1,$2,$3::uuid,$4,$5,$6,$7::jsonb,$8,$9,$10::jsonb,$11,$12::timestamptz) AS receipt',
      values: [this.workspaceId, this.ownerId, command.requestId, hash, this.advisor.original.authority, this.advisor.proof.sessionTokenHash, JSON.stringify(execution), payload ? JSON.stringify(payload) : null, digest, JSON.stringify(records), options.contextDigest ?? businessDigest({}), options.validUntil ?? null] }, signal, options.before, options.after);
    if (!row?.receipt) throw new AdvisorError('unavailable'); return row.receipt;
  }
  async readVersion(id: string, signal: AbortSignal): Promise<BusinessVersionView> {
    const catalog = await this.catalog(signal, { includeLocations: false }); const view = catalog.versions.find(v => v.versionId === uuid(id));
    if (!view || !catalog.sources.some(s => s.sourceId === view.sourceId && !s.deleted) || ['ERASED', 'DISCARDED'].includes(view.status)) throw new AdvisorError('forbidden');
    const full = await this.materialize(catalog, [view.versionId], signal); return full.versions.find(v => v.versionId === view.versionId)!;
  }
  async readMap(id: string, signal: AbortSignal): Promise<BusinessMapView> {
    const [row] = await this.guarded<{ map_version_id: string; digest: string; status: BusinessMapView['status']; current: boolean; payload: string | null }>({ text: 'SELECT * FROM owner_advisor_business_maps WHERE workspace_id=$1 AND map_version_id=$2::uuid', values: [this.workspaceId, uuid(id)] }, signal);
    if (!row?.payload) throw new AdvisorError('forbidden'); const input = parseBusinessMap(JSON.parse(row.payload)); if (businessDigest(input) !== row.digest) throw new AdvisorError('conflict');
    return { mapVersionId: row.map_version_id, digest: row.digest, status: row.status, current: row.current, input };
  }
  async reviewHandle(id: string, signal: AbortSignal): Promise<string> {
    const [row] = await this.guarded<{ id: string }>({ text: 'SELECT read_receipt_id AS id FROM owner_advisor_business_read_receipts WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3::uuid AND authority=$4 AND session_hash=$5 AND expires_at>clock_timestamp()', values: [this.workspaceId, this.ownerId, uuid(id), this.advisor.original.authority, this.advisor.proof.sessionTokenHash] }, signal);
    if (!row) throw new AdvisorError('conflict'); return row.id;
  }
  async reserveInspection(identity: string, queryHash: string, context: unknown, signal: AbortSignal): Promise<BusinessInspection> {
    if (!/^[a-f0-9]{64}$/.test(queryHash)) throw new AdvisorError('conflict'); uuid(identity);
    await this.guarded({ text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_business_inspections WHERE workspace_id=$1 AND inspection_id=$2::uuid) OR
      ((SELECT count(*) FROM owner_advisor_business_inspections WHERE workspace_id=$1 AND expires_at>clock_timestamp())+(SELECT count(*) FROM owner_advisor_business_read_receipts WHERE workspace_id=$1 AND expires_at>clock_timestamp())<1000 AND
       (SELECT count(*) FROM owner_advisor_business_operations WHERE workspace_id=$1)+(SELECT count(*) FROM owner_advisor_business_inspections WHERE workspace_id=$1)<10000) THEN '1' ELSE 'advisor_business_limit' END)::integer`, values: [this.workspaceId, identity] }, signal, [], [
      { text: "UPDATE owner_advisor_business_inspections SET result=NULL,fence=NULL,context=NULL,state='expired' WHERE workspace_id=$1 AND expires_at<=clock_timestamp() AND state<>'expired'", values: [this.workspaceId] },
      { text: 'INSERT INTO owner_advisor_business_inspections(workspace_id,owner_id,inspection_id,query_hash,authority,session_hash,context) VALUES($1,$2,$3::uuid,$4,$5,$6,$7::jsonb) ON CONFLICT(workspace_id,inspection_id) DO NOTHING', values: [this.workspaceId, this.ownerId, identity, queryHash, this.advisor.original.authority, this.advisor.proof.sessionTokenHash, JSON.stringify(context)] },
    ]);
    const row = await this.readInspection(identity, signal); if (row.query_hash !== queryHash || businessDigest(row.context) !== businessDigest(context)) throw new AdvisorError('conflict'); return row;
  }
  async completeInspection(identity: string, result: unknown, fence: unknown, signal: AbortSignal, before: SqlStatement[] = [], after: SqlStatement[] = []): Promise<void> {
    const [row] = await this.guarded<{ inspection_id: string }>({ text: "UPDATE owner_advisor_business_inspections SET result=$4,fence=$5::jsonb,state='completed' WHERE workspace_id=$1 AND owner_id=$2 AND inspection_id=$3::uuid AND authority=$6 AND session_hash=$7 AND expires_at>clock_timestamp() AND state='running' RETURNING inspection_id", values: [this.workspaceId, this.ownerId, uuid(identity), JSON.stringify(result), JSON.stringify(fence), this.advisor.original.authority, this.advisor.proof.sessionTokenHash] }, signal, before, after);
    if (!row) throw new AdvisorError('conflict');
  }
  async peekInspection(identity: string, signal: AbortSignal): Promise<boolean> {
    const [row] = await this.guarded<{present:boolean}>({text:'SELECT EXISTS(SELECT 1 FROM owner_advisor_business_inspections WHERE workspace_id=$1 AND inspection_id=$2::uuid) AS present',values:[this.workspaceId,uuid(identity)]},signal);return row?.present===true;
  }
  async readInspection(identity: string, signal: AbortSignal): Promise<BusinessInspection> {
    const [row] = await this.guarded<BusinessInspection>({ text: "SELECT *,expires_at::text FROM owner_advisor_business_inspections WHERE workspace_id=$1 AND owner_id=$2 AND inspection_id=$3::uuid AND expires_at>clock_timestamp() AND state<>'expired'", values: [this.workspaceId, this.ownerId, uuid(identity)] }, signal);
    if (!row || row.authority !== this.advisor.original.authority || row.session_hash !== this.advisor.proof.sessionTokenHash) throw new AdvisorError('conflict'); return row;
  }
}
