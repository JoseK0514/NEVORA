import { describe, expect, it } from 'vitest';
import { evaluateRequestDeadlines, resolveOperationalRuleProfile, resolveShiftChangePolicy } from './policy';
import type { DeadlineInput } from './types';
const input: DeadlineInput = {stage:'SUBMIT',now:'2026-10-05T09:00:00Z',earliestShiftStart:'2026-10-06T10:00:00Z',currentSubmissionAdvanceMinutes:1440,currentCompletionAdvanceMinutes:120,recordedCompletionDeadline:null};
const scope = {revision:1,mode:'AUTOMATIC_WHEN_VALID',submissionAdvanceMinutes:0,completionAdvanceMinutes:0};
describe('policy configuration', () => {
 it('preserves independent modes and explicit zero versus unknown', () => {
  expect(resolveShiftChangePolicy({version:1,revision:1,swap:scope,coverage:{...scope,mode:'MANAGER_REVIEW',submissionAdvanceMinutes:null}})).toMatchObject({swap:{mode:'AUTOMATIC_WHEN_VALID',submissionAdvanceMinutes:0},coverage:{mode:'MANAGER_REVIEW',submissionAdvanceMinutes:null}});
  expect(resolveShiftChangePolicy(null)).toBeNull();
 });
 it('fails closed for malformed policy instead of supplying defaults', () => {
  for(const raw of [{},{version:1,revision:1,swap:{...scope,submissionAdvanceMinutes:-1},coverage:scope},{version:1,revision:1,swap:{...scope,completionAdvanceMinutes:1},coverage:scope}]) expect(resolveShiftChangePolicy(raw)).toBeNull();
 });
 it('distinguishes reviewed not applicable from unknown or fabricated review', () => {
  const unknown=resolveOperationalRuleProfile(null);
  expect(unknown.minimumRest.status).toBe('UNKNOWN');
  expect(resolveOperationalRuleProfile({...unknown,revision:1,reviewedBy:'owner',reviewedAt:'2026-10-01T00:00:00Z',minimumRest:{status:'NOT_APPLICABLE',reviewedBy:'owner',reviewedAt:'2026-10-01T00:00:00Z'}}).minimumRest.status).toBe('NOT_APPLICABLE');
  expect(resolveOperationalRuleProfile({...unknown,minimumRest:{status:'NOT_APPLICABLE'}}).minimumRest.status).toBe('UNKNOWN');
 });
});
describe('deadlines', () => {
 it('separates closed submission from still-open completion', () => {
  expect(evaluateRequestDeadlines({...input,now:'2026-10-05T10:00:00Z'})).toMatchObject({status:'READY',allowed:false,submissionDeadline:'2026-10-05T10:00:00.000Z',completionDeadline:'2026-10-06T08:00:00.000Z'});
  expect(evaluateRequestDeadlines({...input,stage:'COMPLETE',now:'2026-10-05T10:00:00Z'})).toMatchObject({allowed:true});
 });
 it('requires known cutoffs and rejects reversed submission/completion policy', () => {
  expect(evaluateRequestDeadlines({...input,currentSubmissionAdvanceMinutes:null})).toEqual({status:'UNVERIFIED',allowed:false});
  expect(evaluateRequestDeadlines({...input,currentSubmissionAdvanceMinutes:0})).toEqual({status:'INVALID_POLICY',allowed:false});
 });
 it('allows explicit zero before but never at shift start', () => {
  expect(evaluateRequestDeadlines({...input,currentSubmissionAdvanceMinutes:0,currentCompletionAdvanceMinutes:0})).toMatchObject({allowed:true});
  expect(evaluateRequestDeadlines({...input,currentSubmissionAdvanceMinutes:0,currentCompletionAdvanceMinutes:0,now:input.earliestShiftStart})).toMatchObject({allowed:false});
 });
 it('uses tighter current deadline without extending recorded consent on loosening', () => {
  expect(evaluateRequestDeadlines({...input,stage:'COMPLETE',recordedCompletionDeadline:'2026-10-06T07:00:00Z'})).toMatchObject({completionDeadline:'2026-10-06T07:00:00.000Z'});
  expect(evaluateRequestDeadlines({...input,stage:'COMPLETE',recordedCompletionDeadline:'2026-10-06T09:00:00Z'})).toMatchObject({completionDeadline:'2026-10-06T08:00:00.000Z'});
 });
});
