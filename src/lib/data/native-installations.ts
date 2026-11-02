import 'server-only';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import type {SqlExecutor, SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import type {NativeBinding, NativeChallenge, NativeEnvironment, NativePlatform, NativeProvider} from '../native-push/types';
import {nativeProofBytes, nativeTokenDigest, parseNativeChallenge, parseNativeMaterialBinding, parseNativePublicKey, verifyNativeProof} from '../native-push/protocol';
import {sealNativeToken} from '../native-push/material';
import {assertManagementProof, isManagementAuthorizationError, managementSessionStatements} from './management-session';
import {getWorkspace, workspaceReadGuard} from './workspaces';
import type {Workspace} from '../domain';

type Failure = {state: 'denied' | 'conflict' | 'unavailable' | 'throttled'};
type ChallengeReply = {state: 'challenge'; challenge: NativeChallenge} | Failure;
type Completion = {state: 'active' | 'complete'; generation: string} | Failure;
type Options = {
  executor: SqlExecutor;
  encryptionKey: Uint8Array;
  origin: string;
  environment: NativeEnvironment;
  applications: Record<NativePlatform, {appId: string; provider: NativeProvider}>;
};
type ChallengeRow = {
  id: string; workspace_id: string; employee_id: string; session_hash: string;
  public_key: string; wire: NativeChallenge;
};
type Installation = {
  employee_id: string; session_hash: string; public_key: string; workspace_id: string;
  origin: string; environment: NativeEnvironment; platform: NativePlatform; app_id: string;
  provider: NativeProvider; key_fingerprint: string; generation: string; status: string;
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const fingerprint = /^[a-f0-9]{64}$/;
const roles = ['EMPLOYEE', 'OWNER'] as const;
const statement = (text: string, values: readonly unknown[] = []): SqlStatement => ({text, values});
function guard(condition: string, values: readonly unknown[], state: Failure['state']): SqlStatement {
  return statement(`SELECT (CASE WHEN (${condition}) THEN '1' ELSE 'native_${state}' END)::integer`, values);
}
function failure(error: unknown): Failure | null {
  if (isManagementAuthorizationError(error) || (error instanceof Error && error.message === 'management_authorization')) return {state: 'denied'};
  if (!error || typeof error !== 'object' || !('code' in error) || !('message' in error)) return null;
  if (error.code === '22P02') {
    for (const state of ['denied', 'conflict', 'unavailable', 'throttled'] as const) {
      if (error.message === `invalid input syntax for type integer: "native_${state}"`) return {state};
    }
    if (error.message === 'invalid input syntax for type integer: "workspace_version_conflict"') return {state: 'unavailable'};
  }
  if (error.code === '23505' && 'constraint' in error && error.constraint === 'native_push_active_token_unique') return {state: 'conflict'};
  return null;
}

/** Ordered non-interactive batches: every lock is followed by a fresh statement.
 * Public keys identify devices; only current server-side sessions authorize an
 * account binding. Tokens reach SQL only as a digest and authenticated ciphertext. */
export function sqlNativeInstallationRepository(options: Options) {
  const {executor, origin, environment} = options;
  const encryptionKey = Buffer.from(options.encryptionKey);
  if (encryptionKey.length !== 32) throw Error('Invalid native configuration');
  const applications = structuredClone(options.applications);
  for (const platform of ['ios', 'android'] as const) {
    parseNativeMaterialBinding({origin, environment, platform, ...applications[platform], keyFingerprint: '0'.repeat(64), generation: randomUUID()});
  }
  const scope = (key: string) => [origin, environment, key];
  const configured = (binding: NativeBinding) => binding.origin === origin && binding.environment === environment
    && applications[binding.platform]?.appId === binding.appId && applications[binding.platform]?.provider === binding.provider;
  const authority = (actor: string, hash: string) => managementSessionStatements({employee: {id: actor}, sessionTokenHash: hash}, actor, roles);
  const keyLock = (key: string) => `native:key:${origin}:${environment}:${key}`;
  const actorLock = (actor: string) => `native:actor:${origin}:${environment}:${actor}`;
  function locks(workspace: Workspace, actors: string[], keys: string[]): SqlStatement[] {
    return [...workspaceReadGuard(workspace),
      statement('SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', [[...new Set(actors)].sort()]),
      statement(`SELECT pg_advisory_xact_lock(hashtextextended(k,734693)) FROM
        (SELECT DISTINCT unnest($1::text[]) AS k ORDER BY k) AS ordered_keys`, [[...new Set(keys)].sort()]),
    ];
  }
  async function workspace(): Promise<Workspace | null> {
    try { return await getWorkspace(executor); } catch { return null; }
  }
  async function installation(key: string): Promise<Installation | undefined> {
    return (await executor.query<Installation>(statement(`SELECT * FROM native_push_installations
      WHERE origin=$1 AND environment=$2 AND key_fingerprint=$3`, scope(key))))[0];
  }
  function expectedGeneration(value: string | null): boolean {return value === null || (typeof value === 'string' && uuid.test(value));}
  function challenge(binding: NativeBinding, operation: NativeChallenge['operation'], generation: string | null): NativeChallenge {
    const issued = new Date();
    return parseNativeChallenge({...binding, version: 1, operation, expectedGeneration: generation,
      challengeId: randomUUID(), nonce: randomBytes(32).toString('base64url'), issuedAt: issued.toISOString(), expiresAt: new Date(issued.getTime() + 120000).toISOString()});
  }
  async function issue(input: {workspace: Workspace; actor: string; hash: string; binding: NativeBinding; spki: string;
    operationId: string; operation: NativeChallenge['operation']; expectedGeneration: string | null; previous?: Installation}): Promise<ChallengeReply> {
    const c = challenge(input.binding, input.operation, input.expectedGeneration);
    const identity = [...scope(c.keyFingerprint), input.operationId, input.actor, input.hash, input.spki, input.operation, input.expectedGeneration];
    const sameOperation = `SELECT 1 FROM native_push_challenges WHERE origin=$1 AND environment=$2 AND key_fingerprint=$3
      AND operation_id=$4::uuid AND employee_id=$5 AND session_hash=$6 AND public_key=$7
      AND wire->>'operation'=$8 AND wire->>'expectedGeneration' IS NOT DISTINCT FROM $9::text`;
    const batch: SqlStatement[] = locks(input.workspace, [input.actor, ...(input.previous ? [input.previous.employee_id] : [])],
      [actorLock(input.actor), keyLock(c.keyFingerprint)]);
    batch.push(statement(`SELECT id FROM native_push_installations WHERE origin=$1 AND environment=$2 AND key_fingerprint=$3 FOR UPDATE`, scope(c.keyFingerprint)));
    if (input.operation !== 'detach') batch.push(...authority(input.actor, input.hash));
    batch.push(guard(`EXISTS (${sameOperation}) OR (
      NOT EXISTS (SELECT 1 FROM native_push_challenges WHERE origin=$1 AND environment=$2 AND key_fingerprint=$3 AND operation_id=$4::uuid)
      AND (($9::uuid IS NULL AND NOT EXISTS (SELECT 1 FROM native_push_installations WHERE origin=$1 AND environment=$2 AND key_fingerprint=$3))
        OR EXISTS (SELECT 1 FROM native_push_installations WHERE origin=$1 AND environment=$2 AND key_fingerprint=$3 AND generation=$9::uuid
          AND public_key=$7 AND platform=$10 AND app_id=$11 AND provider=$12 ${input.operation === 'enroll' ? '' : 'AND employee_id=$5 AND session_hash=$6'}))
      )`, [...identity, c.platform, c.appId, c.provider], 'conflict'));
    batch.push(guard(`EXISTS (${sameOperation}) OR (
      (SELECT count(*) FROM native_push_challenges WHERE origin=$1 AND environment=$2 AND key_fingerprint=$3 AND issued_at>clock_timestamp()-interval '1 minute')<5
      AND (SELECT count(*) FROM native_push_challenges WHERE employee_id=$5 AND issued_at>clock_timestamp()-interval '1 minute')<20)`, identity, 'throttled'));
    batch.push(statement(`INSERT INTO native_push_challenges
      (id,operation_id,workspace_id,employee_id,session_hash,origin,environment,key_fingerprint,public_key,wire,issued_at,expires_at)
      VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::timestamptz,$12::timestamptz)
      ON CONFLICT (origin,environment,key_fingerprint,operation_id) DO NOTHING`,
    [c.challengeId, input.operationId, input.workspace.id, input.actor, input.hash, origin, environment, c.keyFingerprint, input.spki, JSON.stringify(c), c.issuedAt, c.expiresAt]));
    batch.push(guard(`EXISTS (${sameOperation} AND issued_at<=clock_timestamp() AND expires_at>clock_timestamp())`, identity, 'conflict'));
    const resultIndex = batch.length;
    batch.push(statement(`SELECT wire FROM native_push_challenges WHERE origin=$1 AND environment=$2 AND key_fingerprint=$3 AND operation_id=$4::uuid`, identity.slice(0, 4)));
    if (input.operation !== 'detach') batch.push(...authority(input.actor, input.hash));
    try {
      const results = await executor.transaction(batch);
      const row = results[resultIndex]?.[0] as {wire: NativeChallenge} | undefined;
      if (!row) throw Error('Native challenge result unavailable');
      const stored = parseNativeChallenge(row.wire);
      if (!configured(stored) || stored.platform !== c.platform || stored.appId !== c.appId || stored.provider !== c.provider) return {state: 'conflict'};
      return {state: 'challenge', challenge: stored};
    } catch (error) {const result = failure(error); if (result) return result; throw error;}
  }
  async function issueEnrollment(input: {proof: SessionMutationProof; binding: NativeBinding; spki: string; operationId: string; expectedGeneration: string | null}): Promise<ChallengeReply> {
    try {
      assertManagementProof(input.proof, input.proof?.employee?.id);
      const binding = parseNativeMaterialBinding({...input.binding, generation: randomUUID()});
      const publicKey = parseNativePublicKey(input.spki);
      if (!configured(binding) || binding.keyFingerprint !== publicKey.keyFingerprint || !uuid.test(input.operationId) || !expectedGeneration(input.expectedGeneration)) return {state: 'denied'};
      const w = await workspace(); if (!w) return {state: 'unavailable'};
      return await issue({workspace: w, actor: input.proof.employee.id, hash: input.proof.sessionTokenHash,
        binding: input.binding, spki: publicKey.spki, operationId: input.operationId, operation: 'enroll', expectedGeneration: input.expectedGeneration,
        previous: await installation(binding.keyFingerprint)});
    } catch (error) {const result = failure(error); if (result) return result; throw error;}
  }
  async function issueMaintenance(input: {keyFingerprint: string; operation: 'rotate' | 'detach'; expectedGeneration: string; operationId: string}): Promise<ChallengeReply> {
    if (!fingerprint.test(input.keyFingerprint) || !uuid.test(input.operationId) || !uuid.test(input.expectedGeneration) || !['rotate', 'detach'].includes(input.operation)) return {state: 'denied'};
    const old = await installation(input.keyFingerprint);
    if (!old || old.generation !== input.expectedGeneration || old.status !== 'active') return {state: 'conflict'};
    const binding: NativeBinding = {origin, environment, platform: old.platform, appId: old.app_id, provider: old.provider, keyFingerprint: old.key_fingerprint};
    if (!configured(binding)) return {state: 'unavailable'};
    const w = await workspace(); if (!w) return {state: 'unavailable'};
    return issue({workspace: w, actor: old.employee_id, hash: old.session_hash, binding, spki: old.public_key,
      operationId: input.operationId, operation: input.operation, expectedGeneration: input.expectedGeneration, previous: old});
  }
  async function complete(input: {challengeId: string; nonce: string; token: string | null; signature: string}): Promise<Completion> {
    if (!uuid.test(input.challengeId)) return {state: 'denied'};
    const stored = (await executor.query<ChallengeRow>(statement(`SELECT id,workspace_id,employee_id,session_hash,public_key,wire
      FROM native_push_challenges WHERE id=$1::uuid AND origin=$2 AND environment=$3`, [input.challengeId, origin, environment])))[0];
    if (!stored) return {state: 'denied'};
    const c = parseNativeChallenge(stored.wire);
    if (!configured(c) || input.nonce !== c.nonce || !verifyNativeProof({challenge: c, spki: stored.public_key, token: input.token, signature: input.signature, now: new Date()})) return {state: 'denied'};
    const w = await workspace(); if (!w || w.id !== stored.workspace_id) return {state: 'unavailable'};
    const old = await installation(c.keyFingerprint);
    const generation = randomUUID();
    const tokenHash = c.operation === 'detach' ? null : nativeTokenDigest(c.platform, input.token);
    const encrypted = c.operation === 'detach' ? null : sealNativeToken(input.token, encryptionKey, {
      origin, environment, platform: c.platform, appId: c.appId, provider: c.provider, keyFingerprint: c.keyFingerprint, generation,
    });
    const inputHash = createHash('sha256').update(nativeProofBytes(c, input.token)).digest('hex');
    const keys = [actorLock(stored.employee_id), keyLock(c.keyFingerprint)];
    if (tokenHash) keys.push(`native:token:${origin}:${environment}:${c.provider}:${c.appId}:${tokenHash}`);
    const batch = locks(w, [stored.employee_id, ...(old ? [old.employee_id] : [])], keys);
    batch.push(statement(`SELECT id FROM native_push_installations WHERE origin=$1 AND environment=$2 AND key_fingerprint=$3 FOR UPDATE`, scope(c.keyFingerprint)));
    batch.push(statement('SELECT id FROM native_push_challenges WHERE id=$1::uuid FOR UPDATE', [c.challengeId]));
    if (c.operation !== 'detach') batch.push(...authority(stored.employee_id, stored.session_hash));
    // The immutable database challenge is authority; a caller cannot substitute
    // a signed wire or an older private account/session context after waiting.
    const immutable = [c.challengeId, JSON.stringify(c), stored.employee_id, stored.session_hash, stored.workspace_id, stored.public_key];
    batch.push(guard(`EXISTS (SELECT 1 FROM native_push_challenges WHERE id=$1::uuid AND wire=$2::jsonb AND employee_id=$3
      AND session_hash=$4 AND workspace_id=$5 AND public_key=$6 AND issued_at<=clock_timestamp() AND expires_at>clock_timestamp())`, immutable, 'denied'));
    const current = [c.challengeId, inputHash, ...scope(c.keyFingerprint), c.expectedGeneration, stored.public_key, c.platform, c.appId, c.provider];
    batch.push(guard(`EXISTS (SELECT 1 FROM native_push_challenges c WHERE c.id=$1::uuid AND (
      (c.completed_input_hash=$2 AND EXISTS (SELECT 1 FROM native_push_installations i WHERE i.origin=$3 AND i.environment=$4 AND i.key_fingerprint=$5
        AND i.generation=c.result_generation AND i.employee_id=c.employee_id AND i.session_hash=c.session_hash
        AND ((c.result_state='active' AND i.status='active') OR (c.result_state='complete' AND i.status='detached'))))
      OR (c.completed_input_hash IS NULL AND (
        ($6::uuid IS NULL AND NOT EXISTS (SELECT 1 FROM native_push_installations WHERE origin=$3 AND environment=$4 AND key_fingerprint=$5))
        OR EXISTS (SELECT 1 FROM native_push_installations WHERE origin=$3 AND environment=$4 AND key_fingerprint=$5 AND generation=$6::uuid
          AND public_key=$7 AND platform=$8 AND app_id=$9 AND provider=$10 ${c.operation === 'enroll' ? '' : 'AND employee_id=c.employee_id AND session_hash=c.session_hash'})
      ))))`, current, 'conflict'));
    if (tokenHash) batch.push(guard(`NOT EXISTS (SELECT 1 FROM native_push_installations WHERE origin=$1 AND environment=$2
      AND provider=$3 AND app_id=$4 AND token_fingerprint=$5 AND status='active' AND key_fingerprint<>$6)`, [origin, environment, c.provider, c.appId, tokenHash, c.keyFingerprint], 'conflict'));
    if (c.operation === 'detach') {
      batch.push(statement(`UPDATE native_push_installations SET status='detached',generation=$1::uuid,encrypted_material=NULL,token_fingerprint=NULL,updated_at=clock_timestamp()
        WHERE origin=$2 AND environment=$3 AND key_fingerprint=$4 AND EXISTS (SELECT 1 FROM native_push_challenges WHERE id=$5::uuid AND completed_input_hash IS NULL)`,
      [generation, ...scope(c.keyFingerprint), c.challengeId]));
    } else {
      batch.push(statement(`INSERT INTO native_push_installations
        (id,workspace_id,employee_id,session_hash,origin,environment,platform,app_id,provider,key_fingerprint,public_key,generation,token_fingerprint,encrypted_material,status,consent_at)
        SELECT $1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::uuid,$13,$14,'active',clock_timestamp()
        FROM native_push_challenges WHERE id=$15::uuid AND completed_input_hash IS NULL
        ON CONFLICT (origin,environment,key_fingerprint) DO UPDATE SET
          employee_id=EXCLUDED.employee_id,session_hash=EXCLUDED.session_hash,generation=EXCLUDED.generation,
          token_fingerprint=EXCLUDED.token_fingerprint,encrypted_material=EXCLUDED.encrypted_material,status='active',
          consent_at=${c.operation === 'enroll' ? 'clock_timestamp()' : 'native_push_installations.consent_at'},updated_at=clock_timestamp()`,
      [randomUUID(), w.id, stored.employee_id, stored.session_hash, origin, environment, c.platform, c.appId, c.provider, c.keyFingerprint, stored.public_key, generation, tokenHash, encrypted, c.challengeId]));
    }
    batch.push(statement(`UPDATE native_push_deliveries d SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,error_class='registration_changed',updated_at=clock_timestamp()
      FROM native_push_installations i WHERE i.id=d.installation_id AND i.origin=$1 AND i.environment=$2 AND i.key_fingerprint=$3
        AND (d.generation<>i.generation OR i.status<>'active') AND d.status IN ('queued','retry_pending','processing')`, scope(c.keyFingerprint)));
    batch.push(statement(`UPDATE native_push_challenges SET completed_input_hash=$1,result_generation=$2::uuid,result_state=$3,completed_at=clock_timestamp()
      WHERE id=$4::uuid AND completed_input_hash IS NULL`, [inputHash, generation, c.operation === 'detach' ? 'complete' : 'active', c.challengeId]));
    batch.push(guard(`EXISTS (SELECT 1 FROM native_push_challenges WHERE id=$1::uuid AND issued_at<=clock_timestamp() AND expires_at>clock_timestamp())`, [c.challengeId], 'denied'));
    if (c.operation !== 'detach') batch.push(...authority(stored.employee_id, stored.session_hash));
    const resultIndex = batch.length;
    batch.push(statement('SELECT result_state AS state,result_generation::text AS generation FROM native_push_challenges WHERE id=$1::uuid', [c.challengeId]));
    try {
      const results = await executor.transaction(batch);
      const result = results[resultIndex]?.[0] as {state: 'active' | 'complete'; generation: string} | undefined;
      if (!result || !['active', 'complete'].includes(result.state) || !uuid.test(result.generation)) throw Error('Native completion result unavailable');
      return result;
    } catch (error) {const result = failure(error); if (result) return result; throw error;}
  }
  async function status(input: {proof: SessionMutationProof; keyFingerprint: string}): Promise<{state: 'active'; generation: string} | {state: 'off'} | Failure> {
    if (!fingerprint.test(input.keyFingerprint)) return {state: 'denied'};
    try {
      assertManagementProof(input.proof, input.proof?.employee?.id);
      const w = await workspace(); if (!w) return {state: 'unavailable'};
      const batch = [...locks(w, [input.proof.employee.id], [keyLock(input.keyFingerprint)]), ...authority(input.proof.employee.id, input.proof.sessionTokenHash)];
      const index = batch.length;
      batch.push(statement(`SELECT generation::text FROM native_push_installations WHERE origin=$1 AND environment=$2 AND key_fingerprint=$3
        AND employee_id=$4 AND session_hash=$5 AND workspace_id=$6 AND status='active'`, [...scope(input.keyFingerprint), input.proof.employee.id, input.proof.sessionTokenHash, w.id]));
      batch.push(...authority(input.proof.employee.id, input.proof.sessionTokenHash));
      const results = await executor.transaction(batch);
      const row = results[index]?.[0] as {generation: string} | undefined;
      return row ? {state: 'active', generation: row.generation} : {state: 'off'};
    } catch (error) {const result = failure(error); if (result) return result; throw error;}
  }
  async function cleanupRevoked(limit: number): Promise<number> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw Error('Invalid native cleanup limit');
    // Challenge/receipt recovery is bounded by its 120-second lifetime. Retain
    // a day for operational reconciliation, then reap only this configured scope.
    await executor.query(statement(`DELETE FROM native_push_challenges WHERE id IN (
      SELECT id FROM native_push_challenges WHERE origin=$1 AND environment=$2 AND expires_at<clock_timestamp()-interval '1 day'
      ORDER BY expires_at,id LIMIT $3 FOR UPDATE SKIP LOCKED)`, [origin, environment, limit]));
    const candidates = await executor.query<Installation & {id: string}>(statement(`SELECT * FROM native_push_installations i
      WHERE origin=$1 AND environment=$2 AND status='active' AND (
        NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id=i.workspace_id AND w.active)
        OR NOT EXISTS (SELECT 1 FROM employees e WHERE e.id=i.employee_id AND e.active AND e.role=ANY($3::text[]))
        OR NOT EXISTS (SELECT 1 FROM employee_sessions s WHERE s.token_hash=i.session_hash AND s.employee_id=i.employee_id))
      ORDER BY id LIMIT $4`, [origin, environment, [...roles], limit]));
    if (!candidates.length) return 0;
    // Cleanup only removes authority. It also works when workspace activation is
    // revoked; keep the same workspace→employee→input→session lock order.
    const batch: SqlStatement[] = [statement('SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR SHARE'),
      statement('SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', [candidates.map(c => c.employee_id).sort()]),
      statement(`SELECT pg_advisory_xact_lock(hashtextextended(k,734693)) FROM
        (SELECT DISTINCT unnest($1::text[]) AS k ORDER BY k) AS ordered_keys`, [candidates.map(c => keyLock(c.key_fingerprint)).sort()]),
      statement('SELECT id FROM native_push_installations WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [candidates.map(c => c.id).sort()]),
      statement('SELECT token_hash FROM employee_sessions WHERE token_hash=ANY($1::text[]) ORDER BY token_hash FOR SHARE', [candidates.map(c => c.session_hash).sort()]),
    ];
    const index = batch.length;
    batch.push(statement(`UPDATE native_push_installations i SET status='detached',generation=gen_random_uuid(),encrypted_material=NULL,token_fingerprint=NULL,updated_at=clock_timestamp()
      WHERE i.id=ANY($1::uuid[]) AND i.origin=$2 AND i.environment=$3 AND i.status='active' AND (
        NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id=i.workspace_id AND w.active)
        OR NOT EXISTS (SELECT 1 FROM employees e WHERE e.id=i.employee_id AND e.active AND e.role=ANY($4::text[]))
        OR NOT EXISTS (SELECT 1 FROM employee_sessions s WHERE s.token_hash=i.session_hash AND s.employee_id=i.employee_id)) RETURNING id`,
    [candidates.map(c => c.id), origin, environment, [...roles]]));
    batch.push(statement(`UPDATE native_push_deliveries d SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,error_class='registration_revoked',updated_at=clock_timestamp()
      FROM native_push_installations i WHERE i.id=d.installation_id AND i.id=ANY($1::uuid[]) AND i.status<>'active' AND d.status IN ('queued','retry_pending','processing')`, [candidates.map(c => c.id)]));
    return (await executor.transaction(batch))[index].length;
  }
  return {issueEnrollment, issueMaintenance, complete, status, cleanupRevoked};
}

export type NativeInstallationRepository = ReturnType<typeof sqlNativeInstallationRepository>;
