import assert from 'node:assert/strict';
import { createECDH, createHash, randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ownedRuntime, sessionCookie } from './lib/premium-owned-runtime.mjs';
import { ownedSnapshot } from './lib/premium-owned-snapshot.mjs';
import { seedOwnedApp } from '../src/test/integration/owned-app-fixture';
import { hashPassword } from '../src/lib/auth/password';
import { fictionalProfile } from '../src/test/fixtures/shift-changes';
import { businessDate } from '../src/lib/business-time';
import { addDays, weekStartFor } from '../src/lib/date-utils';
import { publishScheduleWithRevision } from '../src/test/integration/management-api';
import { encryptSubscriptionMaterial, createInstallationProof } from '../src/lib/notifications/installation';
import { sqlSubscriptionRepository } from '../src/lib/data/push-subscriptions';
import type { NotificationIntent } from '../src/lib/notifications/types';
import { withdrawalIdentity } from '../src/lib/time-off-withdrawal';

const evidence = resolve(process.env.NEVORA_PREMIUM_EVIDENCE ?? '/tmp/nevora-premium-submissions');
const app = await ownedRuntime(evidence, false, { pushCapture: true });
const q = (text: string, values: readonly unknown[] = []) => app.database.executor.query<Record<string, unknown>>({ text, values });
const report = { checkpoint: app.checkpoint, root: app.root, checks: [] as { name: string; passed: boolean; result?: unknown; error?: string }[], resetCount: 0, closed: false };
const require = createRequire(import.meta.url);
const { encodeReply } = require('next/dist/compiled/react-server-dom-turbopack/client.node') as { encodeReply(value: unknown): Promise<string | FormData> };
try {
  await seedOwnedApp(app.database.executor);
  const password = randomBytes(24).toString('base64url'), passwordHash = await hashPassword(password);
  await writeFile(join(app.root, 'access.json'), JSON.stringify({ accounts: ['QAOWNER', 'AUDIT-M', 'AUDIT-E', 'AUDIT-SWAP'], password }), { mode: 0o600 });
  for (const id of ['AUDIT-M', 'AUDIT-E', 'AUDIT-SWAP']) {
    await q("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,$2,$3,'555-0199',$4,$5,'loc-1')", [id, id === 'AUDIT-SWAP' ? 'Riley' : 'Fictional', id === 'AUDIT-SWAP' ? 'Rivera' : id, id.toLowerCase() + '@example.invalid', id === 'AUDIT-M' ? 'MANAGER' : 'EMPLOYEE']);
    await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')", [id]);
    await q("INSERT INTO employee_positions VALUES($1,'qa-pos')", [id]);
    await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)', [id, passwordHash]);
    await q("INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile) VALUES($1,40,40,$2)", [id, JSON.stringify(fictionalProfile())]);
    await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT $1||'-'||d,$1,d,'08:00','16:00' FROM generate_series(0,6) d", [id]);
  }
  await q('UPDATE employee_credentials SET password_hash=$1 WHERE employee_id=\'QAOWNER\'', [passwordHash]);
  const today = businessDate(new Date(), 'America/Puerto_Rico'), week = addDays(weekStartFor(today), 7);
  await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('audit-next','loc-1',$1,'DRAFT','QAOWNER')", [week]);
  for (let day = 0; day < 7; day++) await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,assignment_origin) VALUES($1,'audit-next',$2,$3,'08:00','16:00','qa-pos','MANAGER')", [day < 5 ? `audit-next-${day}-1` : `x-swap-${day}`, day < 5 ? 'AUDIT-E' : 'AUDIT-SWAP', addDays(week, day)]);
  await publishScheduleWithRevision({ locationId: 'loc-1', weekStart: week, managerId: 'QAOWNER' }, app.database.executor);
  await q("INSERT INTO clocker_devices(id,location_id,name) VALUES('submission-device','loc-1','Fictional Submission Device')");
  await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) VALUES('submission-entry','AUDIT-E','loc-1','submission-device',($1::date+time '08:00') AT TIME ZONE 'America/Puerto_Rico',($1::date+time '16:00') AT TIME ZONE 'America/Puerto_Rico','CLOCKED_OUT')", [addDays(today, -1)]);
  const cookies: Record<string, string> = {};
  for (const id of ['QAOWNER', 'AUDIT-M', 'AUDIT-E', 'AUDIT-SWAP']) cookies[id] = await sessionCookie(app.database, id);
  const tokenHash = (id: string) => createHash('sha256').update(cookies[id].slice('fuel_session='.length)).digest('hex');
  const correctionAuthority = (id: string) => createHash('sha256').update('nevora:time-correction:intent:v1\0').update(id).update('\0').update(tokenHash(id)).digest('hex');
  const communicationAuthority = (id: string) => createHash('sha256').update(JSON.stringify(['nevora:communication:lifetime:v1', id, tokenHash(id)])).digest('hex');
  const request = async (path: string, id: string, body?: unknown, header?: string, extra: Record<string, string> = {}) => {
    const response = await fetch(app.url + path, { method: body === undefined ? 'GET' : 'POST', headers: { Cookie: cookies[id], Origin: app.url, 'Sec-Fetch-Site': 'same-origin', 'x-nevora-actor': id, ...(header ? { [header]: '1' } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'manual', signal: AbortSignal.timeout(60000) });
    return { status: response.status, body: await response.json() as Record<string, unknown> };
  };
  const form = (fields: Record<string, string>) => { const data = new FormData(); for (const [k, v] of Object.entries(fields)) data.set(k, v); return data; };
  const action = async (path: string, id: string, name: string, fields: Record<string, string>, previous?: object) => {
    const warm = await fetch(app.url + path, { headers: { Cookie: cookies[id] }, signal: AbortSignal.timeout(60000) }); await warm.text();
    const manifest = JSON.parse(await readFile(join(app.app, '.next/dev/server/server-reference-manifest.json'), 'utf8'));
    const entry = Object.entries(manifest.node).find(([, v]) => (v as { exportedName?: string }).exportedName === name);
    assert(entry, 'Action must exist in the real compiled manifest: ' + name);
    const payload = await encodeReply(previous === undefined ? [form(fields)] : [previous, form(fields)]);
    const response = await fetch(app.url + path, { method: 'POST', headers: { Cookie: cookies[id], Origin: app.url, 'Sec-Fetch-Site': 'same-origin', 'Next-Action': entry[0], Accept: 'text/x-component', ...(typeof payload === 'string' ? { 'Content-Type': 'text/plain;charset=UTF-8' } : {}) }, body: payload, redirect: 'manual', signal: AbortSignal.timeout(60000) });
    return { status: response.status, redirect: response.headers.get('x-action-redirect') ?? response.headers.get('location'), text: await response.text() };
  };
  const snapshot = await ownedSnapshot(app, evidence);
  const tables = ['employees', 'employee_credentials', 'employee_sessions', 'time_off_requests', 'time_off_withdrawal_operations', 'availability_windows', 'time_correction_requests', 'communications', 'communication_revisions', 'communication_operations', 'schedules', 'shifts', 'schedule_copy_receipts', 'shift_exchanges', 'shift_change_operations', 'password_recovery_proofs', 'push_subscriptions', 'push_deliveries', 'notifications'];
  // Only hash tables that exist in this exact migration chain.
  const existing = await q("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  const selected = tables.filter(t => existing.some(r => r.tablename === t));
  const fingerprint = async () => (await q(`SELECT md5(jsonb_build_array(${selected.map(t => `(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) FROM ${t} t)`).join(',')})::text) AS hash`))[0].hash;
  const baseline = await fingerprint();
  const record = async (name: string, test: () => Promise<unknown>) => {
    await snapshot.restore(); report.resetCount++; assert.equal(await fingerprint(), baseline, 'Reset must restore exact baseline rows');
    try { report.checks.push({ name, passed: true, result: await test() }); }
    catch (error) { report.checks.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) }); }
    await writeFile(join(evidence, 'submissions-results.json'), JSON.stringify(report, null, 2));
  };
  const submit = async () => {
    const requestId = randomUUID(), result = await action('/app/requests', 'AUDIT-E', 'requestTimeOffAction', { requestId, startDate: addDays(week, 14), endDate: addDays(week, 14), reason: 'Fictional submission inspection' });
    assert.equal(result.status, 200); assert(result.redirect?.includes('submitted=1'), 'Submission must return its framework redirect');
    assert.equal((await q('SELECT status FROM time_off_requests WHERE id=$1', [requestId]))[0].status, 'PENDING');
    return requestId;
  };
  await record('submit and withdraw time off', async () => {
    const id = await submit(), fields = { requestId: id, operationId: withdrawalIdentity(id), confirmed: 'yes' };
    const result = await action('/app/requests', 'AUDIT-E', 'withdrawTimeOffAction', fields, { outcome: 'idle' });
    assert.equal(result.status, 200); assert(result.text.includes('withdrawn'));
    assert.equal((await q('SELECT status FROM time_off_requests WHERE id=$1', [id]))[0].status, 'CANCELLED');
    const first = await q('SELECT reviewed_at::text FROM time_off_requests WHERE id=$1', [id]);
    const retry = await action('/app/requests', 'AUDIT-E', 'withdrawTimeOffAction', fields, { outcome: 'idle' });
    assert.equal(retry.status, 200); assert(retry.text.includes('withdrawn'));
    assert.deepEqual(await q('SELECT reviewed_at::text FROM time_off_requests WHERE id=$1', [id]), first);
    return { submitResponse: 200, frameworkRedirect: 'submitted=1', withdrawalResponse: 200, savedStatus: 'CANCELLED', actionOutcome: 'withdrawn', replayPreservesFirstReceipt: true };
  });
  for (const decision of ['APPROVED', 'DENIED']) await record('manager ' + decision, async () => {
    const id = await submit(); const result = await action('/app/requests?tab=pending', 'AUDIT-M', 'reviewTimeOffAction', { requestId: id, decision, returnTo: 'inbox', returnFilter: 'requests' });
    assert.equal(result.status, 200); assert(result.redirect?.includes('/app/inbox?filter=requests&decided='));
    const [row] = await q('SELECT status,reviewed_by,reviewed_at FROM time_off_requests WHERE id=$1', [id]);
    assert.equal(row.status, decision); assert.equal(row.reviewed_by, 'AUDIT-M'); assert(row.reviewed_at);
    return { response: 200, returnedTo: 'Inbox', savedStatus: row.status, reviewer: row.reviewed_by, reviewedAtPresent: true };
  });
  await record('save normal availability', async () => {
    const result = await action('/app/availability', 'AUDIT-E', 'saveAvailabilityAction', { 'available-1': 'on', 'start-1': '09:00', 'end-1': '17:00' });
    assert.equal(result.status, 200); assert(result.redirect?.includes('saved=1'));
    assert.deepEqual(await q("SELECT day_of_week,start_time::text,end_time::text FROM availability_windows WHERE employee_id='AUDIT-E'"), [{ day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00' }]);
    return { response: 200, frameworkRedirect: 'saved=1', savedWindows: 1 };
  });
  await record('request a time correction', async () => {
    const punch = await q("SELECT clock_in_at::text,clock_out_at::text FROM time_entries WHERE id='submission-entry'");
    const operationId = randomUUID(); const result = await request('/api/employee/time-corrections', 'AUDIT-E', { kind: 'ENTRY_BOUNDARY', operationId, timeEntryId: 'submission-entry', proposedStartAt: addDays(today, -1) + 'T12:15:00Z', proposedEndAt: addDays(today, -1) + 'T19:55:00Z', reason: 'Fictional correction inspection' }, 'x-nevora-time-correction', { 'x-nevora-correction-authority': correctionAuthority('AUDIT-E') });
    assert.equal(result.status, 202); assert.equal(result.body.state, 'pending');
    assert.equal((await q("SELECT result->>'status' AS status FROM time_correction_events WHERE request_id=$1 ORDER BY revision DESC LIMIT 1", [result.body.requestId]))[0].status, 'pending');
    assert.deepEqual(await q("SELECT clock_in_at::text,clock_out_at::text FROM time_entries WHERE id='submission-entry'"), punch);
    return { response: result.status, savedEventStatus: 'pending' };
  });
  await record('publish a location update', async () => {
    const draft = { type: 'LOCATION_ANNOUNCEMENT', scope: { kind: 'LOCATION', locationId: 'loc-1' }, title: 'Fictional release inspection', body: 'Local-only update for fictional team members.', acknowledgement: 'OPTIONAL', expiresAt: null };
    const authority = communicationAuthority('AUDIT-M'), headers = { 'x-nevora-communication-authority': authority };
    const preview = await request('/api/manager/communications/preview', 'AUDIT-M', draft, 'x-nevora-communication', headers);
    assert.equal(preview.status, 200); assert.equal(preview.body.state, 'ready');
    const result = await request('/api/manager/communications', 'AUDIT-M', { kind: 'PUBLISH', operationId: randomUUID(), authority, draft, audienceFingerprint: preview.body.fingerprint }, 'x-nevora-communication', headers);
    assert.equal(result.status, 200); assert.equal(result.body.status, 'committed');
    assert.equal((await q('SELECT count(*)::int AS n FROM communication_revisions WHERE communication_id=$1', [result.body.id]))[0].n, 1);
    return { response: 200, savedRevisions: 1, previewRecipients: preview.body.count };
  });
  await record('copy a real published week to a new draft', async () => {
    const operationId = randomUUID(), target = addDays(week, 7);
    const result = await request('/api/schedule-copy', 'AUDIT-M', { kind: 'PREVIOUS_WEEK', operationId, weekStart: target }, 'x-nevora-schedule-copy');
    assert.equal(result.status, 200); assert.equal(result.body.state, 'complete');
    assert.equal((await q('SELECT count(*)::int AS n FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE s.week_start=$1 AND s.status=\'DRAFT\'', [target]))[0].n, 7);
    assert.equal((await q('SELECT count(*)::int AS n FROM schedule_copy_receipts WHERE operation_id=$1', [operationId]))[0].n, 1);
    return { response: 200, savedDraftShifts: 7, savedReceipts: 1 };
  });
  await record('render swap targets, propose and accept a swap over HTTP', async () => {
    const page = await fetch(app.url + '/app/exchange/swap?sourceShiftId=audit-next-0-1', { headers: { Cookie: cookies['AUDIT-E'] }, signal: AbortSignal.timeout(60000) });
    const html = await page.text(); assert.equal(page.status, 200); assert(html.includes('Riley Rivera')); assert(!html.includes('No shifts to swap'));
    // Read exact displayed hidden terms from the actual rendered form.
    const fields: Record<string, string> = {};
    for (const match of html.matchAll(/<input\b[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/g)) if (['sourceShiftId','sourceEpisodeId','sourceTermsFingerprint','targetShiftId','targetEpisodeId','targetTermsFingerprint'].includes(match[1]) && fields[match[1]] === undefined) fields[match[1]] = match[2];
    // Selection-dependent hidden fields appear after client selection; the exact
    // reviewed target props are already in this response's real RSC payload.
    const serialized = html.replace(/\\"/g, '"');
    const targetTerms = serialized.match(/\{"targetShiftId":"x-swap-5","targetEpisodeId":"([^"]+)","targetTermsFingerprint":"([^"]+)"\}/);
    assert(targetTerms, 'The real RSC payload must carry the reviewed target fields');
    Object.assign(fields, { targetShiftId: 'x-swap-5', targetEpisodeId: targetTerms[1], targetTermsFingerprint: targetTerms[2] });
    assert.equal(Object.keys(fields).length, 6, 'The rendered swap terms must be available');
    const proposed = await action('/app/exchange', 'AUDIT-E', 'shiftChangeAction', { ...fields, kind: 'PROPOSE_SWAP', operationId: randomUUID() });
    assert.equal(proposed.status, 200); assert(proposed.text.includes('"status":"pending"'));
    const [row] = await q("SELECT id,request_revision FROM shift_exchanges WHERE source_shift_id='audit-next-0-1'");
    const accepted = await action('/app/exchange', 'AUDIT-SWAP', 'shiftChangeAction', { kind: 'ACCEPT', operationId: randomUUID(), requestId: String(row.id), expectedRevision: String(row.request_revision) });
    assert.equal(accepted.status, 200); assert(accepted.text.includes('"status":"completed"'));
    assert.equal((await q("SELECT employee_id FROM shifts WHERE id='audit-next-0-1'"))[0].employee_id, 'AUDIT-SWAP');
    assert.equal((await q('SELECT employee_id FROM shifts WHERE id=$1', [fields.targetShiftId]))[0].employee_id, 'AUDIT-E');
    return { renderedTargets: true, proposeResponse: 200, acceptResponse: 200, assignmentsSwapped: true };
  });
  const files = async (kind: string) => { try { return await readdir(join(app.root, 'captures', kind)); } catch { return []; } };
  await record('password recovery HTTP captures email and persists the matching one-use proof', async () => {
    const before = await files('email');
    const result = await request('/api/auth/recovery', 'AUDIT-E', { employeeId: 'AUDIT-E', email: 'audit-e@example.invalid' }, 'x-nevora-recovery');
    assert.equal(result.status, 202); assert.equal(result.body.state, 'accepted');
    let captured: string | undefined;
    for (let n = 0; n < 100; n++) { captured = (await files('email')).find(f => !before.includes(f)); if (captured) break; await new Promise(r => setTimeout(r, 100)); }
    assert(captured, 'Recovery email must be captured locally');
    const file = join(app.root, 'captures', 'email', captured), eml = await readFile(file, 'utf8');
    const decoded = eml.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_all, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    const proof = decoded.match(/#proof=([A-Za-z0-9_-]+)/)?.[1]; assert(proof, 'Captured email must have a reset proof');
    assert.equal((await q('SELECT count(*)::int AS n FROM password_recovery_proofs WHERE employee_id=\'AUDIT-E\' AND token_hash=$1 AND used_at IS NULL', [createHash('sha256').update(proof).digest('hex')]))[0].n, 1);
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    return { response: 202, capturedEmails: 1, matchingUnconsumedProof: true, mode: '0600' };
  });
  await record('real worker HTTP captures push and saves provider-accepted delivery', async () => {
    assert(app.push); const before = await files('push'), installation = createInstallationProof('test');
    const key = createECDH('prime256v1'); key.generateKeys();
    const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/fictional-local-capture', expirationTime: null, keys: { p256dh: key.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
    const repository = sqlSubscriptionRepository(app.database.executor);
    assert.equal((await repository.enroll({ employeeId: 'AUDIT-E', installationHash: installation.installationHash, environment: 'test', generation: installation.generation, expectedGeneration: null, endpointFingerprint: createHash('sha256').update(subscription.endpoint).digest('hex'), encryptedMaterial: encryptSubscriptionMaterial(subscription, app.push.encryptionKey, installation), sessionHash: tokenHash('AUDIT-E'), expiresAt: null })).state, 'active');
    const [device] = await repository.listActive('AUDIT-E', 'test');
    const intent: NotificationIntent = { id: randomUUID(), employeeId: 'AUDIT-E', type: 'SELF_TEST', title: 'NEVORA local inspection', body: 'Fictional captured notification.', actionHref: '/app', eventKey: randomUUID(), environment: 'test', source: { kind: 'SELF_TEST', id: device.id, version: device.generation }, effectiveVersion: device.generation, purpose: 'TEST', urgency: 'high', dueAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 1800000).toISOString() };
    assert(await repository.queueSelfTest({ proof: installation, employeeId: 'AUDIT-E', sessionHash: tokenHash('AUDIT-E'), intent }));
    const result = await request('/api/internal/notifications/dispatch', 'AUDIT-E', undefined, undefined, { Authorization: 'Bearer ' + app.push.workerSecret });
    assert.equal(result.status, 200); assert(Number(result.body.accepted) >= 1);
    const captured = (await files('push')).filter(f => !before.includes(f)); assert(captured.length >= 1);
    const payloads = await Promise.all(captured.map(async f => JSON.parse(await readFile(join(app.root, 'captures', 'push', f), 'utf8'))));
    assert(payloads.some(p => p.payload.notificationId === intent.id && p.payload.kind === 'SELF_TEST'));
    assert.equal((await q('SELECT status FROM push_deliveries WHERE notification_id=$1', [intent.id]))[0].status, 'provider_accepted');
    return { response: 200, accepted: result.body.accepted, capturedSelfTest: true, savedDeliveryStatus: 'provider_accepted', providerContacted: false };
  });
  await snapshot.restore(); report.resetCount++; assert.equal(await fingerprint(), baseline);
  await mkdir(join(evidence, 'guards'), { recursive: true });
  const ownershipPath = join(app.root, 'ownership.json'), original = await readFile(ownershipPath, 'utf8');
  try { const changed = JSON.parse(original); changed.clusterMarker = 'wrong'; await writeFile(ownershipPath, JSON.stringify(changed)); await assert.rejects(() => snapshot.restore(), /manifest changed/); report.checks.push({ name: 'changed ownership manifest refuses reset before writes', passed: true }); }
  finally { await writeFile(ownershipPath, original); }
  const originalConnection = app.database.connectionString;
  try { app.database.connectionString = originalConnection.replace(/premium_[a-f0-9]{12}$/, 'premium_000000000000'); await assert.rejects(() => snapshot.restore(), /connection changed/); report.checks.push({ name: 'changed connection string refuses reset before writes', passed: true }); }
  finally { app.database.connectionString = originalConnection; }
  assert.equal(await fingerprint(), baseline);
} finally {
  await app.close(); report.closed = true;
  await writeFile(join(evidence, 'submissions-results.json'), JSON.stringify(report, null, 2));
}
if (report.checks.some(c => !c.passed)) throw Error('Submission probes failed; see the local results file.');
