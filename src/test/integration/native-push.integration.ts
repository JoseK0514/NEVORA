import {afterAll, beforeAll, beforeEach, expect, it} from 'vitest';
import {createHash, generateKeyPairSync, randomUUID, sign} from 'node:crypto';
import {Client} from 'pg';
import {createDisposableFoundationDatabase} from './local-postgres';
import {nativeProofBytes} from '../../lib/native-push/protocol';
import {openNativeToken} from '../../lib/native-push/material';
import type {NativeChallenge} from '../../lib/native-push/types';
import type {SqlExecutor} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';

async function api() {
  const result = await import('../../lib/data/native-installations').catch(() => ({}));
  expect(result).toHaveProperty('sqlNativeInstallationRepository');
  return result as typeof import('../../lib/data/native-installations');
}
let database: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
let db: SqlExecutor;
const key = Buffer.alloc(32, 7);
const appId = 'com.velani.nevora.development';
const pair = generateKeyPairSync('ec', {namedCurve: 'prime256v1'});
const spki = pair.publicKey.export({format: 'der', type: 'spki'}).toString('base64url');
const fingerprint = createHash('sha256').update(pair.publicKey.export({format: 'der', type: 'spki'})).digest('hex');
const binding = {origin: 'https://nevora.example', environment: 'test', platform: 'ios', appId, provider: 'apns-sandbox', keyFingerprint: fingerprint} as const;
const actors = {E: 'EMPLOYEE', O: 'OWNER', M: 'MANAGER'} as const;
function proof(actor: keyof typeof actors = 'E'): SessionMutationProof {
  return {employee: {id: 'QA-NATIVE-' + actor, firstName: 'Fictional', lastName: actor, role: actors[actor], primaryLocationId: 'loc-1'},
    sessionTokenHash: createHash('sha256').update('fictional-native-session-' + actor).digest('hex')};
}
const query = <T = Record<string, unknown>>(text: string, values: readonly unknown[] = []) => db.query<T>({text, values});
async function repo(executor = db) {
  const m = await api();
  return m.sqlNativeInstallationRepository({executor, encryptionKey: key, origin: binding.origin, environment: 'test',
    applications: {ios: {appId, provider: 'apns-sandbox'}, android: {appId, provider: 'fcm'}}});
}
async function issued(repository: Awaited<ReturnType<typeof repo>>, actor: keyof typeof actors = 'E', expectedGeneration: string | null = null) {
  const reply = await repository.issueEnrollment({proof: proof(actor), binding, spki, operationId: randomUUID(), expectedGeneration});
  expect(reply.state).toBe('challenge');
  if (reply.state !== 'challenge') throw Error('Expected fictional enrollment challenge');
  return reply.challenge;
}
function completeInput(challenge: NativeChallenge, token: string | null = 'a1b2') {
  return {challengeId: challenge.challengeId, nonce: challenge.nonce, token,
    signature: sign('sha256', nativeProofBytes(challenge, token), pair.privateKey).toString('base64url')};
}
async function enrolled(repository: Awaited<ReturnType<typeof repo>>) {
  const result = await repository.complete(completeInput(await issued(repository)));
  expect(result.state).toBe('active');
  if (result.state !== 'active') throw Error('Expected fictional active installation');
  return result;
}

beforeAll(async () => {database = await createDisposableFoundationDatabase({mode: 'current-runtime'}); db = database.executor;});
afterAll(async () => {await database?.dispose();});
beforeEach(async () => {
  await query('DELETE FROM employees WHERE id LIKE $1', ['QA-NATIVE-%']);
  await query('UPDATE workspaces SET active=true WHERE singleton=true');
  for (const actor of Object.keys(actors) as (keyof typeof actors)[]) {
    const p = proof(actor);
    await query(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
      VALUES($1,'Fictional',$2,'NO-REAL-PHONE',$3,'loc-1')`, [p.employee.id, actor, p.employee.role]);
    await query(`INSERT INTO employee_sessions(token_hash,employee_id,expires_at)
      VALUES($1,$2,clock_timestamp()+interval '1 day')`, [p.sessionTokenHash, p.employee.id]);
  }
});

it('persists only encrypted native material and returns only owned registration state', async () => {
  const repository = await repo(); const active = await enrolled(repository);
  expect(await repository.status({proof: proof(), keyFingerprint: fingerprint})).toEqual({state: 'active', generation: active.generation});
  expect(await repository.status({proof: proof('O'), keyFingerprint: fingerprint})).toEqual({state: 'off'});
  const rows = await query<{encrypted_material: string; generation: string}>('SELECT encrypted_material,generation FROM native_push_installations');
  expect(rows).toHaveLength(1);
  expect(rows[0].encrypted_material).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
  expect(openNativeToken(rows[0].encrypted_material, key, {...binding, generation: active.generation})).toBe('a1b2');
  expect((await query<{count: string}>('SELECT count(*) FROM push_subscriptions'))[0].count).toBe('0');
});

it('refuses Manager registration and authority revoked after challenge issuance', async () => {
  const repository = await repo();
  expect(await repository.issueEnrollment({proof: proof('M'), binding, spki, operationId: randomUUID(), expectedGeneration: null})).toEqual({state: 'denied'});
  const challenge = await issued(repository);
  await query('DELETE FROM employee_sessions WHERE token_hash=$1', [proof().sessionTokenHash]);
  expect(await repository.complete(completeInput(challenge))).toEqual({state: 'denied'});
  expect((await query<{count: string}>('SELECT count(*) FROM native_push_installations'))[0].count).toBe('0');
});

it('rejects a substituted token, nonce or key without consuming a valid challenge', async () => {
  const repository = await repo(), challenge = await issued(repository), input = completeInput(challenge);
  expect(await repository.complete({...input, token: 'a1b3'})).toEqual({state: 'denied'});
  expect(await repository.complete({...input, nonce: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE'})).toEqual({state: 'denied'});
  const other = generateKeyPairSync('ec', {namedCurve: 'prime256v1'});
  expect(await repository.complete({...input, signature: sign('sha256', nativeProofBytes(challenge, 'a1b2'), other.privateKey).toString('base64url')})).toEqual({state: 'denied'});
  expect((await repository.complete(input)).state).toBe('active');
});

it('returns one durable generation for concurrent identical completion and retries', async () => {
  const repository = await repo(), input = completeInput(await issued(repository));
  const [a, b] = await Promise.all([repository.complete(input), repository.complete(input)]);
  expect(a.state).toBe('active'); expect(b).toEqual(a);
  expect(await repository.complete(input)).toEqual(a);
  expect((await query<{count: string}>('SELECT count(*) FROM native_push_installations'))[0].count).toBe('1');
});

it('recovers an uncertain committed completion from its durable receipt', async () => {
  const repository = await repo(), input = completeInput(await issued(repository));
  const ambiguous: SqlExecutor = {...db, transaction: async (statements, signal) => {
    await db.transaction(statements, signal); throw Error('fictional connection lost after commit');
  }};
  await expect((await repo(ambiguous)).complete(input)).rejects.toThrow('fictional connection lost after commit');
  const retry = await repository.complete(input); expect(retry.state).toBe('active');
  const rows = await query<{generation: string}>('SELECT generation::text FROM native_push_installations');
  expect(rows).toHaveLength(1);
  if (retry.state === 'active') expect(rows[0].generation).toBe(retry.generation);
});

it('rotates tokens and fences old receipts and generation claims', async () => {
  const repository = await repo(), initial = await issued(repository), original = completeInput(initial);
  const active = await repository.complete(original); expect(active.state).toBe('active');
  if (active.state !== 'active') throw Error('Expected active fixture');
  const rotate = await repository.issueMaintenance({keyFingerprint: fingerprint, operation: 'rotate', expectedGeneration: active.generation, operationId: randomUUID()});
  expect(rotate.state).toBe('challenge'); if (rotate.state !== 'challenge') throw Error('Expected rotation challenge');
  const next = await repository.complete(completeInput(rotate.challenge, 'b1c2')); expect(next.state).toBe('active');
  if (next.state !== 'active') throw Error('Expected rotated fixture');
  expect(next.generation).not.toBe(active.generation);
  expect(await repository.complete(original)).toEqual({state: 'conflict'});
  expect(await repository.issueMaintenance({keyFingerprint: fingerprint, operation: 'rotate', expectedGeneration: active.generation, operationId: randomUUID()})).toEqual({state: 'conflict'});
  expect(await repository.status({proof: proof(), keyFingerprint: fingerprint})).toEqual({state: 'active', generation: next.generation});
});

it('allows the same physical key to rebind only through fresh account authority and generation', async () => {
  const repository = await repo(), initial = await issued(repository), old = completeInput(initial);
  const active = await repository.complete(old); if (active.state !== 'active') throw Error('Expected active fixture');
  const next = await repository.complete(completeInput(await issued(repository, 'O', active.generation)));
  expect(next.state).toBe('active'); expect(await repository.complete(old)).toEqual({state: 'conflict'});
  expect(await repository.status({proof: proof(), keyFingerprint: fingerprint})).toEqual({state: 'off'});
  if (next.state === 'active') expect(await repository.status({proof: proof('O'), keyFingerprint: fingerprint})).toEqual({state: 'active', generation: next.generation});
});

it('refuses cross-key token takeover by a different authenticated account', async () => {
  const repository = await repo(); const active = await enrolled(repository);
  const other = generateKeyPairSync('ec', {namedCurve: 'prime256v1'});
  const bytes = other.publicKey.export({format: 'der', type: 'spki'});
  const reply = await repository.issueEnrollment({proof: proof('O'), binding: {...binding, keyFingerprint: createHash('sha256').update(bytes).digest('hex')},
    spki: bytes.toString('base64url'), operationId: randomUUID(), expectedGeneration: null});
  expect(reply.state).toBe('challenge'); if (reply.state !== 'challenge') throw Error('Expected challenge fixture');
  const input = {...completeInput(reply.challenge), signature: sign('sha256', nativeProofBytes(reply.challenge, 'a1b2'), other.privateKey).toString('base64url')};
  expect(await repository.complete(input)).toEqual({state: 'conflict'});
  expect(await repository.status({proof: proof(), keyFingerprint: fingerprint})).toEqual({state: 'active', generation: active.generation});
});

it('can detach a revoked registration using its key without recreating a session', async () => {
  const repository = await repo(), active = await enrolled(repository);
  await query('DELETE FROM employee_sessions WHERE token_hash=$1', [proof().sessionTokenHash]);
  const reply = await repository.issueMaintenance({keyFingerprint: fingerprint, operation: 'detach', expectedGeneration: active.generation, operationId: randomUUID()});
  expect(reply.state).toBe('challenge'); if (reply.state !== 'challenge') throw Error('Expected detach fixture');
  const done = await repository.complete(completeInput(reply.challenge, null)); expect(done.state).toBe('complete');
  const rows = await query<{status: string; encrypted_material: string | null}>('SELECT status,encrypted_material FROM native_push_installations');
  expect(rows).toHaveLength(1); expect(rows[0]).toEqual({status: 'detached', encrypted_material: null});
  expect((await query<{count: string}>('SELECT count(*) FROM employee_sessions WHERE token_hash=$1', [proof().sessionTokenHash]))[0].count).toBe('0');
});
it('retains detached revision for off-to-on and explicitly reconciles lost receipts across accounts',async()=>{
 const repository=await repo(),active=await enrolled(repository);
 const detach=await repository.issueMaintenance({keyFingerprint:fingerprint,operation:'detach',expectedGeneration:active.generation,operationId:randomUUID()});
 if(detach.state!=='challenge')throw Error('Expected detach challenge');
 const off=await repository.complete(completeInput(detach.challenge,null));if(off.state!=='complete')throw Error('Expected detached receipt');
 expect(off.generation).not.toBe(active.generation);
 expect((await repository.complete(completeInput(await issued(repository,'E',off.generation)))).state).toBe('active');
 // A different signed-in account cannot use stale ordinary enrollment. A
 // deliberate reconciliation captures the actual revision once, then needs
 // this same private key and current account authority at completion.
 expect(await repository.issueEnrollment({proof:proof('O'),binding,spki,operationId:randomUUID(),expectedGeneration:null})).toEqual({state:'conflict'});
 const reply=await repository.issueEnrollment({proof:proof('O'),binding,spki,operationId:randomUUID(),expectedGeneration:null,reconcile:true});
 expect(reply.state).toBe('challenge');if(reply.state!=='challenge')throw Error('Expected reconciliation');
 expect(reply.challenge.expectedGeneration).not.toBeNull();
 const other=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 expect(await repository.complete({...completeInput(reply.challenge),signature:sign('sha256',nativeProofBytes(reply.challenge,'a1b2'),other.privateKey).toString('base64url')})).toEqual({state:'denied'});
 const rebound=await repository.complete(completeInput(reply.challenge));expect(rebound.state).toBe('active');
 expect(await repository.status({proof:proof(),keyFingerprint:fingerprint})).toEqual({state:'off'});
 if(rebound.state==='active')expect(await repository.status({proof:proof('O'),keyFingerprint:fingerprint})).toEqual(rebound);
});
it('reconciliation cannot retarget a concurrent revision or survive account revocation',async()=>{
 const repository=await repo(),active=await enrolled(repository);
 const input={proof:proof('O'),binding,spki,operationId:randomUUID(),expectedGeneration:null,reconcile:true};
 const pending=await repository.issueEnrollment(input);if(pending.state!=='challenge')throw Error('Expected reconciliation');
 const rotate=await repository.issueMaintenance({keyFingerprint:fingerprint,operation:'rotate',expectedGeneration:active.generation,operationId:randomUUID()});if(rotate.state!=='challenge')throw Error('Expected rotation');
 expect((await repository.complete(completeInput(rotate.challenge,'a1b3'))).state).toBe('active');
 expect(await repository.complete(completeInput(pending.challenge))).toEqual({state:'conflict'});
 const next=await repository.issueEnrollment({...input,operationId:randomUUID()});if(next.state!=='challenge')throw Error('Expected fresh reconciliation');
 await query('DELETE FROM employee_sessions WHERE token_hash=$1',[proof('O').sessionTokenHash]);
 expect(await repository.complete(completeInput(next.challenge))).toEqual({state:'denied'});
});
it.each(['enroll','rotate','detach'] as const)('explicitly recovers a lost %s commit acknowledgement for a different current account',async operation=>{
 const repository=await repo();
 let challenge:NativeChallenge;
 if(operation==='enroll')challenge=await issued(repository);
 else {
  const active=await enrolled(repository),reply=await repository.issueMaintenance({keyFingerprint:fingerprint,operation,expectedGeneration:active.generation,operationId:randomUUID()});
  if(reply.state!=='challenge')throw Error('Expected maintenance');challenge=reply.challenge;
 }
 const dropped:SqlExecutor={...db,transaction:async(statements,signal)=>{await db.transaction(statements,signal);throw Error('fictional lost response after commit');}};
 await expect((await repo(dropped)).complete(completeInput(challenge,operation==='detach'?null:'a1b2'))).rejects.toThrow('fictional lost response');
 const request={proof:proof('O'),binding,spki,operationId:randomUUID(),expectedGeneration:null,reconcile:true};
 const recovery=await repository.issueEnrollment(request);if(recovery.state!=='challenge')throw Error('Expected explicit recovery');
 expect(await repository.issueEnrollment(request)).toEqual(recovery);
 const result=await repository.complete(completeInput(recovery.challenge,'a1b3'));expect(result.state).toBe('active');
 if(result.state==='active')expect(await repository.status({proof:proof('O'),keyFingerprint:fingerprint})).toEqual(result);
});

it('cleans revoked ownership and never keeps a plaintext token after cleanup', async () => {
  const repository = await repo(); await enrolled(repository);
  await query('UPDATE employees SET active=false WHERE id=$1', [proof().employee.id]);
  expect(await repository.cleanupRevoked(10)).toBe(1);
  const row = (await query<{status: string; encrypted_material: string | null}>('SELECT status,encrypted_material FROM native_push_installations'))[0];
  expect(row.status).toBe('detached'); expect(row.encrypted_material).toBeNull();
});

it('reuses an identical issuance operation but rejects a different account using that operation', async () => {
  const repository = await repo(), operationId = randomUUID();
  const input = {proof: proof(), binding, spki, operationId, expectedGeneration: null};
  const first = await repository.issueEnrollment(input);
  expect(first.state).toBe('challenge');
  expect(await repository.issueEnrollment(input)).toEqual(first);
  expect(await repository.issueEnrollment({...input, proof: proof('O')})).toEqual({state: 'conflict'});
  expect((await query<{count: string}>('SELECT count(*) FROM native_push_challenges'))[0].count).toBe('1');
});

it('bounds challenge issuance while allowing a retry of an already issued operation', async () => {
  const repository = await repo(), operationId = randomUUID();
  const input = {proof: proof(), binding, spki, operationId, expectedGeneration: null};
  const first = await repository.issueEnrollment(input);
  for (let i = 0; i < 4; i++) await issued(repository);
  expect(await repository.issueEnrollment({...input, operationId: randomUUID()})).toEqual({state: 'throttled'});
  expect(await repository.issueEnrollment(input)).toEqual(first);
  expect((await query<{count: string}>('SELECT count(*) FROM native_push_challenges'))[0].count).toBe('5');
});

for (const age of ['expired', 'future'] as const) it(`rejects a correctly signed ${age} challenge`, async () => {
  const repository = await repo(), c = await issued(repository);
  const issuedAt = new Date(Date.now() + (age === 'expired' ? -121000 : 1000)).toISOString();
  const changed = {...c, issuedAt, expiresAt: new Date(Date.parse(issuedAt) + 120000).toISOString()};
  await query('UPDATE native_push_challenges SET wire=$1::jsonb,issued_at=$2::timestamptz,expires_at=$3::timestamptz WHERE id=$4::uuid', [JSON.stringify(changed), changed.issuedAt, changed.expiresAt, c.challengeId]);
  expect(await repository.complete(completeInput(changed))).toEqual({state: 'denied'});
  expect(await query('SELECT id FROM native_push_installations')).toEqual([]);
});

it('refuses a second signed token on a completed challenge without disturbing the first result', async () => {
  const repository = await repo(), c = await issued(repository), input = completeInput(c);
  const active = await repository.complete(input);
  expect(await repository.complete(completeInput(c, 'b1c2'))).toEqual({state: 'conflict'});
  expect(await repository.complete(input)).toEqual(active);
});

it('allows only one competing account rebind from a generation', async () => {
  const repository = await repo(), active = await enrolled(repository);
  const a = await issued(repository, 'E', active.generation), b = await issued(repository, 'O', active.generation);
  const results = await Promise.all([repository.complete(completeInput(a)), repository.complete(completeInput(b))]);
  expect(results.map(r => r.state).sort()).toEqual(['active', 'conflict']);
  const winner = results.find(r => r.state === 'active');
  const rows = await query<{generation: string}>('SELECT generation::text FROM native_push_installations');
  expect(rows).toHaveLength(1); if (winner?.state === 'active') expect(rows[0].generation).toBe(winner.generation);
});

it('rechecks an employee role changed after the challenge was read but before the transaction', async () => {
  const repository = await repo(), input = completeInput(await issued(repository)); let once = true;
  const racing: SqlExecutor = {...db, transaction: async (statements, signal) => {
    if (once) {once = false; await query("UPDATE employees SET role='MANAGER' WHERE id=$1", [proof().employee.id]);}
    return db.transaction(statements, signal);
  }};
  expect(await (await repo(racing)).complete(input)).toEqual({state: 'denied'});
  expect(await query('SELECT id FROM native_push_installations')).toEqual([]);
});

for (const expires of ['session', 'challenge', 'neither'] as const) it(`rechecks ${expires} expiry after a real blocked enrollment INSERT`, async () => {
  const repository = await repo(); let c = await issued(repository);
  if (expires === 'challenge') {
    const issuedAt = new Date(Date.now() - 118500).toISOString();
    c = {...c, issuedAt, expiresAt: new Date(Date.parse(issuedAt) + 120000).toISOString()};
    await query('UPDATE native_push_challenges SET wire=$1::jsonb,issued_at=$2::timestamptz,expires_at=$3::timestamptz WHERE id=$4::uuid', [JSON.stringify(c), c.issuedAt, c.expiresAt, c.challengeId]);
  }
  if (expires === 'session') await query("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1500 milliseconds' WHERE token_hash=$1", [proof().sessionTokenHash]);
  const blocker = new Client({connectionString: database.connectionString}), worker = new Client({connectionString: database.connectionString});
  await blocker.connect(); await worker.connect();
  let pending: Promise<Awaited<ReturnType<typeof repository.complete>>> | undefined;
  try {
    const pid = (await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const transport: SqlExecutor = {query: async <T>(s: {text: string; values: readonly unknown[]}) => (await worker.query(s.text, [...s.values])).rows as T[],
      transaction: async statements => {
        await worker.query('BEGIN');
        try {
          const results: unknown[][] = [];
          for (const s of statements) results.push((await worker.query(s.text, [...s.values])).rows);
          await worker.query('COMMIT'); return results;
        } catch (error) {await worker.query('ROLLBACK'); throw error;}
      }};
    await blocker.query('BEGIN'); await blocker.query('LOCK TABLE native_push_installations IN SHARE MODE');
    pending = (await repo(transport)).complete(completeInput(c));
    let observed = false;
    for (let attempt = 0; attempt < 300; attempt++) {
      const [row] = await query<{blocked: boolean; statement: string}>('SELECT cardinality(pg_blocking_pids(pid))>0 AS blocked,query AS statement FROM pg_stat_activity WHERE pid=$1', [pid]);
      if (row?.blocked && row.statement.includes('INSERT INTO native_push_installations')) {observed = true; break;}
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(observed, 'Real INSERT reached the conflicting table lock after initial authorization').toBe(true);
    if (expires === 'session') await query('SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05) FROM employee_sessions WHERE token_hash=$1', [proof().sessionTokenHash]);
    if (expires === 'challenge') await query('SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05) FROM native_push_challenges WHERE id=$1::uuid', [c.challengeId]);
    await blocker.query('ROLLBACK');
    const result = await pending;
    expect(result.state).toBe(expires === 'neither' ? 'active' : 'denied');
    expect(await query('SELECT id FROM native_push_installations')).toHaveLength(expires === 'neither' ? 1 : 0);
    const [receipt] = await query<{result_generation: string | null}>('SELECT result_generation::text FROM native_push_challenges WHERE id=$1::uuid', [c.challengeId]);
    expect(receipt.result_generation === null).toBe(expires !== 'neither');
  } finally {await blocker.query('ROLLBACK'); await pending; await worker.end(); await blocker.end();}
});

for (const operation of ['rotate', 'detach', 'cleanup'] as const) it(`cancels queued and leased deliveries during ${operation} without deleting the notification`, async () => {
  const repository = await repo(), active = await enrolled(repository), notice = randomUUID();
  await query("INSERT INTO notifications(id,employee_id,type,title,body) VALUES($1,$2,'SCHEDULE_PUBLISHED','NEVORA','Open NEVORA.')", [notice, proof().employee.id]);
  await query(`INSERT INTO native_push_deliveries(notification_id,installation_id,generation,status,next_attempt_at,expires_at,lease_token,lease_expires_at)
    SELECT $1,id,generation,'processing',clock_timestamp(),clock_timestamp()+interval '1 hour',gen_random_uuid(),clock_timestamp()+interval '1 minute' FROM native_push_installations`, [notice]);
  if (operation === 'cleanup') {
    await query('DELETE FROM employee_sessions WHERE token_hash=$1', [proof().sessionTokenHash]); await repository.cleanupRevoked(10);
  } else {
    const reply = await repository.issueMaintenance({keyFingerprint: fingerprint, operation, expectedGeneration: active.generation, operationId: randomUUID()});
    if (reply.state !== 'challenge') throw Error('Expected maintenance challenge');
    await repository.complete(completeInput(reply.challenge, operation === 'detach' ? null : 'b1c2'));
  }
  expect(await query('SELECT status,lease_token,lease_expires_at FROM native_push_deliveries')).toEqual([{status: 'cancelled', lease_token: null, lease_expires_at: null}]);
  expect(await query('SELECT id FROM notifications WHERE id=$1', [notice])).toHaveLength(1);
});

it('purges old challenges in bounded batches even when there are no revoked installations', async () => {
  const repository = await repo();
  for (let i = 0; i < 3; i++) await issued(repository);
  await query("UPDATE native_push_challenges SET issued_at=$1::timestamptz,expires_at=$1::timestamptz+interval '120 seconds'", [new Date(Date.now() - 2 * 86400000).toISOString()]);
  expect(await repository.cleanupRevoked(2)).toBe(0);
  expect((await query<{count: string}>('SELECT count(*) FROM native_push_challenges'))[0].count).toBe('1');
});
