import { describe, expect, it } from 'vitest';
import { parsePhotoCommand, parsePhotoFailure, parsePhotoNotice, parsePhotoPolicyUpdate, unconfiguredPhotoPolicy, publicPhotoPolicy } from './validation';
import { PHOTO_ACTIONS } from './contracts';
const command = { commandId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', verificationId: 'a'.repeat(64) };
const policy = { expectedVersion: 0, enabled: true, events: [...PHOTO_ACTIONS], retentionDays: 14, failureBehavior: 'ALLOW_WITH_EXCEPTION' };
describe('photo contracts', () => {
  it('defaults all four selections and approved retention/fallback while collection stays inactive', () => {
    expect(unconfiguredPhotoPolicy()).toMatchObject({ version: 0, enabled: false, events: PHOTO_ACTIONS, retentionDays: 30, failureBehavior: 'ALLOW_WITH_EXCEPTION' });
  });
  it('accepts exact original command without accepting client identities', () => { expect(parsePhotoCommand(command)).toEqual(command); });
  it.each([null, [], {}, { ...command, workspaceId: 'other' }, { ...command, employeeId: 'other' }, { ...command, deviceId: 'other' },
    { ...command, locationId: 'other' }, { ...command, action: 'CLOCK_IN' }, { ...command, performedAt: '2026-10-10' },
    { ...command, commandId: command.commandId + '\n' }, { ...command, verificationId: command.verificationId + '\n' }])('rejects injected or malformed authority %j', value => {
    expect(() => parsePhotoCommand(value)).toThrow('Check the photo request');
  });
  it('supports each original punch action as a company setting and canonicalizes order', () => {
    expect(parsePhotoPolicyUpdate({ ...policy, events: ['CLOCK_OUT', 'CLOCK_IN'] }).events).toEqual(['CLOCK_IN', 'CLOCK_OUT']);
  });
  it.each([{ ...policy, workspaceId: 'other' }, { ...policy, expectedVersion: -1 }, { ...policy, expectedVersion: '0' }, { ...policy, expectedVersion: 0.5 },
    { ...policy, expectedVersion: 2_147_483_647 }, { ...policy, enabled: 'true' }, { ...policy, events: [] }, { ...policy, events: ['CLOCK_IN', 'CLOCK_IN'] },
    { ...policy, events: ['CONTINUOUS_VIDEO'] }, { ...policy, expectedVersion: 1, retentionDays: null }, { ...policy, retentionDays: 0 }, { ...policy, retentionDays: 31 },
    { ...policy, expectedVersion: 1, failureBehavior: null }, { ...policy, failureBehavior: 'REQUIRE_PHOTO' }])('rejects unsafe/incomplete policy %j', value => {
    expect(() => parsePhotoPolicyUpdate(value)).toThrow();
  });
  it('normalizes only a first save to approved defaults without changing enablement', () => {
    expect(parsePhotoPolicyUpdate({ ...policy, enabled: false, retentionDays: null, failureBehavior: null })).toMatchObject({
      expectedVersion: 0, enabled: false, retentionDays: 30, failureBehavior: 'ALLOW_WITH_EXCEPTION' });
  });
  it('preserves explicitly disabled legacy NULL settings without backfilling their version', () => {
    expect(parsePhotoPolicyUpdate({ ...policy, expectedVersion: 4, enabled: false, events: [], retentionDays: null, failureBehavior: null })).toEqual({
      expectedVersion: 4, enabled: false, events: [], retentionDays: null, failureBehavior: null });
    expect(publicPhotoPolicy({ version: 4, enabled: false, events: [], retentionDays: null, failureBehavior: null })).toMatchObject({
      version: 4, enabled: false, events: [], retentionDays: null, failureBehavior: null });
  });
  it.each([1, 30])('accepts approved company retention boundary %s days', retentionDays => {
    expect(parsePhotoPolicyUpdate({ ...policy, retentionDays })).toMatchObject({ retentionDays });
  });
  it('projects policy without private identities', () => {
    expect(publicPhotoPolicy({ version: 1, enabled: true, events: ['CLOCK_OUT'], retentionDays: 1, failureBehavior: 'ALLOW_WITH_EXCEPTION' })).toEqual({
      version: 1, enabled: true, events: ['CLOCK_OUT'], retentionDays: 1, failureBehavior: 'ALLOW_WITH_EXCEPTION', captureMaxBytes: 524288, captureMaxDimension: 640, uploadWindowSeconds: 300 });
  });
  it.each(['CAMERA_DENIED', 'CAMERA_UNAVAILABLE', 'CAPTURE_FAILED', 'UPLOAD_FAILED', 'EMPLOYEE_CHANGED', 'PHOTO_ALTERNATIVE'])('records bounded failure code %s', code => {
    expect(parsePhotoFailure({ ...command, code })).toMatchObject({ code });
  });
  it('rejects raw exception text as a failure reason', () => { expect(() => parsePhotoFailure({ ...command, code: 'SECRET driver stack' })).toThrow(); });
});

const effectivePolicy = { ...unconfiguredPhotoPolicy(), version: 2, enabled: true, retentionDays: 14 };
const notice = { policyVersion: 2, profileVersion: 1, companyName: 'Fictional Industry', retentionDays: 14, assistanceContact: 'Fictional help desk',
  assistanceInstructions: 'Ask the fictional help desk for assistance.', cleanupDisclosure: 'Fictional cleanup disclosure for this test.',
  backupDisclosure: 'Fictional backup disclosure; expired access does not promise immediate erasure.' };
describe('effective company photo notice', () => {
  it('accepts bounded actual configuration for the exact policy without invented values', () => {
    expect(parsePhotoNotice(notice, effectivePolicy)).toEqual(notice);
  });
  it.each([null, {}, { ...notice, workspaceId: 'other' }, { ...notice, policyVersion: 1 }, { ...notice, retentionDays: 30 },
    { ...notice, companyName: '' }, { ...notice, companyName: '[Company name]' }, { ...notice, assistanceContact: '{{contact}}' },
    { ...notice, assistanceContact: 'a'.repeat(201) }, { ...notice, assistanceInstructions: 'a'.repeat(1001) },
    { ...notice, cleanupDisclosure: 'a'.repeat(1501) }, { ...notice, backupDisclosure: '' },
    { ...notice, backupDisclosure: 'hidden\u0000content' }])('keeps capture unavailable for missing/stale/placeholder notice %j', value => {
    expect(parsePhotoNotice(value, effectivePolicy)).toBeNull();
  });
  it('rejects legacy NULL retention notice instead of inventing a duration', () => {
    expect(parsePhotoNotice(notice, { ...effectivePolicy, retentionDays: null })).toBeNull();
  });
});
