import {randomUUID} from 'node:crypto';
import {afterEach, beforeEach, expect, it} from '@rstest/core';
import sharp from 'sharp';
import {ClockerFaceVerification} from '../../lib/clocker/face-verification/service.server';
import {runClockerFaceWorker, type FaceMatcher} from '../../lib/clocker/face-verification/worker.server';
import {handleFaceEmployee, handleFaceOwner} from '../../lib/clocker/face-verification/transport.server';
import {createCurrentClockerPhotoAuthority} from '../../lib/clocker/photo-server/authority.server';
import {ClockerPunchService} from '../../lib/clocker/punches.server';
import {readPortalNotificationList} from '../../lib/data/portal-notification-list.server';
import {readFaceKey} from '../../lib/clocker/face-verification/crypto.server';
import {createPunchFixture} from './clocker-punch-fixture';
import {photoFixture} from './clocker-photo-fixture';
import type {SessionMutationProof} from '../../lib/shift-changes/types';

const scope = {workspaceId: 'workspace-fuel', projectId: 'fictional-project', branchId: 'fictional-branch'};
const ownerSession: SessionMutationProof = {
  employee: {id: 'c34-owner', firstName: 'Owner', lastName: 'QA', role: 'OWNER', primaryLocationId: 'loc-1'},
  sessionTokenHash: 'a'.repeat(64),
};
const matcher: FaceMatcher = {modelVersion: 'fixture-model', compare: async () => ({outcome: 'mismatch', template: Buffer.from('fictional-vector')})};

let fixture: Awaited<ReturnType<typeof createPunchFixture>>;
let photo: Awaited<ReturnType<typeof photoFixture>>;
let service: ClockerFaceVerification;
let identity: Awaited<ReturnType<typeof fixture.identity>>['proof'];
let image: Buffer;

beforeEach(async () => {
  fixture = await createPunchFixture({companyAccess: true});
  photo = await photoFixture(fixture);
  service = new ClockerFaceVerification(fixture.db.executor, createCurrentClockerPhotoAuthority(fixture.key),
    scope, Buffer.alloc(32, 19));
  identity = (await fixture.identity()).proof;
  image = await sharp({create: {width: 100, height: 100, channels: 3, background: '#3b577c'}}).jpeg().toBuffer();
  await fixture.q(`INSERT INTO clocker_photo_platform_lifecycle
      (workspace_id,project_id,branch_id,worker_role_name,enabled,cleanup_disclosure,backup_disclosure,attested_until,last_success_at)
    VALUES($1,$2,$3,session_user,true,'Fictional staging cleanup evidence.','Fictional staging backup evidence.',now()+interval '1 day',now());
  `.trim(), [scope.workspaceId, scope.projectId, scope.branchId]);
  await fixture.q(`INSERT INTO clocker_face_platform
      (workspace_id,project_id,branch_id,worker_role,enabled,alerts_enabled,model_version,notice_version,notice_en,notice_es,retention_days,attested_until,last_success_at)
    VALUES($1,$2,$3,session_user,true,true,$4,1,'Fictional voluntary face verification notice.',
      'Aviso ficticio de verificación facial voluntaria.',30,now()+interval '1 day',now())`,
  [scope.workspaceId, scope.projectId, scope.branchId, matcher.modelVersion]);
});
afterEach(async () => fixture?.db.dispose());

async function save(enabled: boolean, expectedVersion: number) {
  return service.owner(photo.owner, {operation: 'save', enabled, expectedVersion});
}

async function enroll() {
  await save(true, 0);
  const employeeId = identity.employeeId;
  expect(await service.owner(photo.owner, {operation: 'request', employeeId, expectedVersion: 0})).toMatchObject({state: 'requested', revision: 1});
  expect(await service.employee(identity, {operation: 'self'})).toMatchObject({state: 'requested', canCapture: true, notice: {version: 1}});
  await expect(service.employee(identity, {operation: 'capture', expectedVersion: 1, noticeVersion: 2, bytes: image})).rejects.toMatchObject({code: 'CONFLICT'});
  expect(await service.employee(identity, {operation: 'capture', expectedVersion: 1, noticeVersion: 1, bytes: image})).toMatchObject({state: 'captured', revision: 2});
  expect(await service.owner(photo.owner, {operation: 'view', employeeId})).toBeInstanceOf(Uint8Array);
  expect(await service.owner(photo.owner, {operation: 'approve', employeeId, expectedVersion: 2})).toMatchObject({state: 'active', revision: 2});
  return employeeId;
}

async function punch(options: {skip?: boolean; action?: 'CLOCK_IN' | 'CLOCK_OUT'} = {}) {
  const punchService = new ClockerPunchService(fixture.key, fixture.db.executor, {photoEvidence: true});
  const view = await punchService.read(identity);
  const {revision, entry, break: currentBreak} = view.snapshot;
  const command = {commandId: randomUUID(), verificationId: view.verificationId, action: options.action ?? 'CLOCK_IN',
    expected: {revision, timeEntryId: entry?.id ?? null, timeEntryVersion: entry?.version ?? null,
      breakEntryId: currentBreak?.id ?? null, breakEntryVersion: currentBreak?.version ?? null}};
  const receipt = await punchService.execute(identity, command);
  const photoCommand = {commandId: command.commandId, verificationId: command.verificationId};
  if (options.skip) expect(await service.skipPunch(identity, photoCommand)).toEqual({skipped: true});
  await photo.runtime.service.upload(identity, photoCommand, image, 'image/jpeg', {policyVersion: 1, profileVersion: 1});
  return {receipt, commandId: command.commandId, deviceId: identity.device.deviceId};
}

const run = (impl = matcher) => runClockerFaceWorker(fixture.db.executor, scope, Buffer.alloc(32, 19), impl);

it('keeps one original punch, emits one current Owner inbox item, and reuses the reference after off/on', async () => {
  const employeeId = await enroll();
  const saved = await punch();
  expect(await run()).toMatchObject({mismatch: 1});
  expect(await run()).toMatchObject({mismatch: 0});
  const [notification] = await fixture.q<{id: string}>('SELECT id::text FROM clocker_face_alerts');
  const id = 'clocker-face-' + notification.id;
  const env = {NEVORA_ENVIRONMENT: 'staging', NEVORA_CLOCKER_PHOTO_RUNTIME: 'neon-staging-v1',
    NEVORA_CLOCKER_PHOTO_WORKSPACE: scope.workspaceId, NEVORA_CLOCKER_PHOTO_PROJECT: scope.projectId,
    NEVORA_CLOCKER_PHOTO_BRANCH: scope.branchId, NEVORA_CLOCKER_FACE_KEY: Buffer.alloc(32, 19).toString('base64url')};
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  try {
    expect(await readPortalNotificationList(ownerSession, 'test', fixture.db.executor)).toMatchObject({
      state: 'ready', items: [{id, label: 'Punch photo needs review', reviewState: 'unread'}],
    });
    delete process.env.NEVORA_CLOCKER_FACE_KEY;
    await fixture.q('ALTER TABLE clocker_face_alerts RENAME TO fixture_hidden_face_alerts');
    try {
      expect(await readPortalNotificationList(ownerSession, 'test', fixture.db.executor)).toMatchObject({state: 'ready', items: []});
    } finally {
      await fixture.q('ALTER TABLE fixture_hidden_face_alerts RENAME TO clocker_face_alerts');
    }
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value !== undefined) process.env[key] = value;
      else delete process.env[key];
    }
  }
  expect(await service.alertReference(photo.owner, id, true)).toEqual({deviceId: saved.deviceId, commandId: saved.commandId});
  expect(await fixture.q('SELECT result FROM clocker_command_ledger')).toEqual([{result: saved.receipt}]);
  expect(await fixture.q('SELECT state FROM clocker_punch_photos')).toEqual([{state: 'stored'}]);
  const [enrollment] = await fixture.q<{reference: string; hasTemplate: boolean}>(
    'SELECT reference_ciphertext AS reference,template_ciphertext IS NOT NULL AS "hasTemplate" FROM clocker_face_enrollments');
  expect(enrollment.hasTemplate).toBe(true);
  expect(enrollment.reference).not.toBe(image.toString('base64url'));
  expect(await save(false, 1)).toMatchObject({enabled: false, version: 2});
  expect(await fixture.q('SELECT reference_ciphertext AS reference, template_ciphertext AS template FROM clocker_face_enrollments')).toEqual([
    {reference: enrollment.reference, template: null},
  ]);
  expect(await service.employee(identity, {operation: 'self'})).toMatchObject({state: 'active', verificationActive: false});
  const off = await punch({action: 'CLOCK_OUT'});
  expect(await fixture.q('SELECT state FROM clocker_punch_photos WHERE command_id=$1::uuid', [off.commandId])).toEqual([{state: 'stored'}]);
  expect(await save(true, 2)).toMatchObject({enabled: true, version: 3});
  expect(await service.owner(photo.owner, {operation: 'enrollment', employeeId})).toMatchObject({state: 'active', revision: 2});
  expect(await service.employee(identity, {operation: 'self'})).toMatchObject({state: 'active', verificationActive: true});
  expect(await run()).toMatchObject({mismatch: 0});
  await punch();
  let loadedSavedReference = false;
  expect(await run({...matcher, compare: async input => {
    loadedSavedReference = input.reference !== null && input.template === null;
    return {outcome: 'match'};
  }})).toMatchObject({match: 1, mismatch: 0});
  expect(loadedSavedReference).toBe(true);
  expect(await fixture.q('SELECT id FROM clocker_face_alerts')).toHaveLength(1);
});

for (const transition of ['disable', 'withdraw', 'photo removal'] as const) {
  it('suppresses a claimed mismatch after ' + transition, async () => {
    await enroll();
    const {receipt, commandId, deviceId} = await punch();
    const compare: FaceMatcher['compare'] = async () => {
      if (transition === 'disable') await save(false, 1);
      if (transition === 'withdraw') await service.employee(identity, {operation: 'withdraw', expectedVersion: 2});
      if (transition === 'photo removal') await photo.runtime.service.removePhoto(photo.owner, {deviceId, commandId});
      return {outcome: 'mismatch'};
    };
    expect(await run({...matcher, compare})).toMatchObject({skipped: 1, mismatch: 0});
    expect(await fixture.q('SELECT state FROM clocker_face_checks')).toEqual([{state: 'skipped'}]);
    expect(await fixture.q('SELECT id FROM clocker_face_alerts')).toEqual([]);
    expect(await fixture.q('SELECT result FROM clocker_command_ledger')).toEqual([{result: receipt}]);
  });
}

it('saves an ordinary photo when the employee skips that individual comparison', async () => {
  await enroll();
  const {receipt} = await punch({skip: true});
  expect(await run()).toMatchObject({mismatch: 0});
  expect(await fixture.q('SELECT state FROM clocker_face_checks')).toEqual([{state: 'skipped'}]);
  expect(await fixture.q('SELECT state FROM clocker_punch_photos')).toEqual([{state: 'stored'}]);
  expect(await fixture.q('SELECT result FROM clocker_command_ledger')).toEqual([{result: receipt}]);
});

it('denies a Manager and never exposes a reference across workspaces', async () => {
  const employeeId = await enroll();
  const manager = {...photo.owner, ownerAccess: photo.owner.ownerAccess && {
    ...photo.owner.ownerAccess, proof: {...ownerSession, employee: {...ownerSession.employee, role: 'MANAGER' as const}},
  }};
  await expect(service.owner(manager, {operation: 'view', employeeId})).rejects.toMatchObject({code: 'ACCESS_DENIED'});
  await expect(service.owner({...photo.owner, workspaceId: 'other-company'}, {operation: 'view', employeeId}))
    .rejects.toMatchObject({code: 'ACCESS_DENIED'});
  expect(await service.alertReference(manager, 'clocker-face-' + randomUUID())).toBeNull();
});

it('retries a temporary matcher failure and stores an inconclusive result without alerting', async () => {
  await enroll();
  const {receipt} = await punch();
  expect(await run({...matcher, compare: async () => {throw Error('fixture unavailable');}})).toMatchObject({retry: 1});
  expect(await fixture.q("SELECT state,attempt FROM clocker_face_checks")).toEqual([{state: 'retry', attempt: 1}]);
  await fixture.q("UPDATE clocker_face_checks SET lease_until=clock_timestamp()-interval '1 second'");
  expect(await run({...matcher, compare: async () => ({outcome: 'inconclusive'})})).toMatchObject({inconclusive: 1});
  expect(await fixture.q("SELECT state,attempt FROM clocker_face_checks")).toEqual([{state: 'inconclusive', attempt: 2}]);
  expect(await fixture.q('SELECT id FROM clocker_face_alerts')).toEqual([]);
  expect(await fixture.q('SELECT result FROM clocker_command_ledger')).toEqual([{result: receipt}]);
});

it('runs a shadow check without alerts, and purges an expired reference while the switch is off', async () => {
  await enroll();
  await fixture.q('UPDATE clocker_face_platform SET alerts_enabled=false');
  await punch();
  expect(await run()).toMatchObject({mismatch: 1});
  expect(await fixture.q('SELECT id FROM clocker_face_alerts')).toEqual([]);
  await save(false, 1);
  await fixture.q("UPDATE clocker_face_enrollments SET expires_at=now()-interval '1 second'");
  expect(await run()).toMatchObject({purged: 1});
  expect(await fixture.q('SELECT state,reference_ciphertext AS reference,template_ciphertext AS template FROM clocker_face_enrollments')).toEqual([
    {state: 'removed', reference: null, template: null},
  ]);
});

it('rejects cross-origin and unauthenticated requests and only the current PIN can enroll itself', async () => {
  const security = {portalOrigin: 'https://fictional.example', production: true};
  const request = (body: object, origin = security.portalOrigin) => new Request(origin + '/face-verification', {
    method: 'POST', headers: {'content-type': 'application/json', origin, 'x-nevora-clocker': '1'}, body: JSON.stringify(body),
  });
  expect((await handleFaceOwner(request({operation: 'policy'}, 'https://other.example'), security, service, async () => photo.owner)).status).toBe(403);
  expect((await handleFaceOwner(request({operation: 'policy'}), security, service, async () => null)).status).toBe(403);
  expect((await handleFaceEmployee(request({operation: 'self', employeeId: 'c34-b'}), security, service, async () => identity)).status).toBe(400);
  expect((await handleFaceEmployee(request({operation: 'self'}), security, service,
    async () => ({...identity, device: {...identity.device, workspaceId: 'foreign'}}))).status).toBe(403);
  expect(readFaceKey({NEVORA_CLOCKER_FACE_KEY: 'invalid'})).toBeNull();
});

it('binds the worker role to the correct workspace and grants no table access', async () => {
  const role = 'nv_face_stg_' + randomUUID().replaceAll('-', '').slice(0, 20);
  await fixture.q(`CREATE ROLE ${role}; GRANT USAGE ON SCHEMA public TO ${role};
    GRANT EXECUTE ON FUNCTION clocker_face_worker(text,text,text,text,text,uuid,text,text) TO ${role}`);
  await fixture.q('UPDATE clocker_face_platform SET worker_role=$1', [role]);
  const asWorker = (text: string, values: unknown[] = []) => fixture.db.executor.transaction([
    {text: `SET LOCAL SESSION AUTHORIZATION ${role}`, values: []}, {text, values},
  ]);
  await expect(asWorker('SELECT reference_ciphertext FROM clocker_face_enrollments')).rejects.toThrow(/permission denied/);
  await expect(asWorker("SELECT clocker_face_worker($1,$2,$3,$4,'maintenance',$5,NULL,NULL)",
    ['foreign', scope.projectId, scope.branchId, matcher.modelVersion, randomUUID()])).rejects.toThrow(/worker_denied/);
  expect((await asWorker("SELECT clocker_face_worker($1,$2,$3,$4,'maintenance',$5,NULL,NULL) AS result",
    [scope.workspaceId, scope.projectId, scope.branchId, matcher.modelVersion, randomUUID()]))[1]).toEqual([{result: {purged: 0}}]);
});
