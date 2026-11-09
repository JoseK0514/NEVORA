import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { preparePublishWarningReview, evaluatePublishWarningPolicy } from '../lib/scheduling/publish-warning-policy';
import type { PublishWarningSnapshot, PublishWarningReview, PublishWarningCommand, PublishWarningReviewRecord } from '../lib/scheduling/publish-warning-policy';
import type { PublishWarningReviewSurfaceProps } from './publish-warning-review-surface';

// An absent new surface is a feature assertion inside each case, never an
// import/collection failure. The actual source-bound policy builds all reviews.
const modulePath = './publish-warning-review-surface';
const surface = await import(modulePath).catch(() => null);
const NOW = '2026-10-09T12:00:00Z';
type Source = PublishWarningSnapshot & { target: NonNullable<PublishWarningSnapshot['target']>;
 canonical: NonNullable<PublishWarningSnapshot['canonical']>; readiness: NonNullable<PublishWarningSnapshot['readiness']> };
function input(): Source {
 return {
  namespace: { workspaceId: 'fictional-tenant-a', actorId: 'fictional-manager', purpose: 'SCHEDULE_PUBLISH', operationId: '10000000-0000-4000-8000-000000000001' },
  authority: { role: 'MANAGER', workspaceActive: true, workforceActive: true, portalState: 'ENABLED', membershipCurrent: true,
   sessionCurrent: true, grantsCurrent: true, publishAllowed: true, receiptReadAllowed: true, sessionVersion: 'session-1',
   grantsVersion: 'grant-1', scopeVersion: 'scope-1', incarnation: '1', expiresAt: '2026-10-09T12:01:00Z',
   administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['fictional-location-a'] } },
  selection: { weekStart: '2026-10-05', locationId: 'fictional-location-a', scheduleId: 'fictional-schedule' },
  locations: [{ id: 'fictional-location-a', workspaceId: 'fictional-tenant-a', active: true }], now: NOW,
  observedAt: NOW, expiresAt: '2026-10-09T12:00:30Z', reviewId: 'review-1', sourceVersion: 'source-1', configurationVersion: 'config-1',
  sourceCurrent: true, sourceComplete: true, footprintComplete: true, affectedLocationIds: ['fictional-location-a'],
  readAllowed: true, permittedFields: ['schedule', 'readiness', 'configuration'], target: { status: 'DRAFT', shiftCount: 0 },
  canonical: { checked: true, allowed: true, issues: [] }, readiness: { locationCoverage: { locationId: 'fictional-location-a', locationName: 'Fictional North',
   totalBlocks: 7, coveredBlocks: 7, uncoveredBlocks: 0, missingLeadBlocks: 0, fullyCovered: true,
   staffingConfigured: true, coverageConfigured: true, positionRequirementsConfigured: true }, requiresDesignatedLead: false,
   positionGapBlocks: 0, hours: { checked: true, underTargetCount: 0, overTargetCount: 0, unconfiguredTargetCount: 0 } },
 };
}
function warned(): Source {
 const s = input(), c = s.readiness.locationCoverage!;
 c.coveredBlocks = 5; c.uncoveredBlocks = 2; c.missingLeadBlocks = 1; c.fullyCovered = false;
 s.readiness.requiresDesignatedLead = true; s.readiness.positionGapBlocks = 1;
 s.readiness.hours = { checked: true, underTargetCount: 2, overTargetCount: 1, unconfiguredTargetCount: 1 };
 return s;
}
function ready(s: Source = warned()): Extract<PublishWarningReview, { state: 'ready' }> {
 const r = preparePublishWarningReview(s); expect(r.state, 'actual policy fixture must prepare a review').toBe('ready');
 if (r.state !== 'ready') throw Error('source-bound review fixture'); return r;
}
function render(review: PublishWarningReview = ready(), changes: Partial<PublishWarningReviewSurfaceProps> = {}) {
 const renderer = surface?.PublishWarningReviewSurface;
 expect(renderer, 'unused F2 warning review surface must be implemented').toBeTypeOf('function');
 const current = review.state === 'ready' ? review : ready();
 const callbacks = { onReasonChange: vi.fn(), onConfirm: vi.fn(), onReturnToReview: vi.fn() };
 const props: PublishWarningReviewSurfaceProps = { result: { state: 'review', review }, connection: 'ready', expected: {
  reviewId: current.reviewId, fingerprint: current.fingerprint, selection: { ...current.selection } }, now: NOW,
  reason: '  Reviewed configured shortages  ', ...callbacks, ...changes };
 const html = renderToStaticMarkup(createElement(renderer, props));
 // Rendering is never submission, retry, an authorization operation or an
 // automatic acknowledgement. Browser event dispatch is a separate root gate.
 for (const cb of Object.values(callbacks)) expect(cb).not.toHaveBeenCalled();
 return html;
}
function confirmation(html: string, label = 'Publish with these warnings') {
 const tag = html.match(new RegExp('<button[^>]*>' + label + '</button>'))?.[0];
 expect(tag, 'named publication choice must be a native button').toBeDefined(); return tag!;
}
function noMutationOrPrivateReview(html: string) {
 expect(html).not.toContain('Publish with these warnings'); expect(html).not.toMatch(/>Publish<\/button>/);
 expect(html).not.toContain('data-warning-code'); expect(html).not.toContain('Warning count');
 expect(html).not.toContain('<textarea'); expect(html).not.toContain('Reviewed configured shortages');
 expect(html).not.toContain('Configured coverage blocks need review.');
 expect(html).not.toContain('fictional-schedule'); expect(html).not.toContain('source-1'); expect(html).not.toContain('v1:');
}
function policyReason(s: Source, reason: string) {
 const r = ready(s), command: PublishWarningCommand = { namespace: { ...s.namespace }, selection: { ...s.selection },
  reviewId: r.reviewId, reviewFingerprint: r.fingerprint, expectedSourceVersion: s.sourceVersion!, expectedConfigurationVersion: s.configurationVersion!,
  choice: 'PUBLISH_WITH_WARNINGS', reason };
 const record: PublishWarningReviewRecord = { namespace: { ...s.namespace }, selection: { ...s.selection }, reviewId: r.reviewId,
  fingerprint: r.fingerprint, sourceVersion: s.sourceVersion!, configurationVersion: s.configurationVersion!, sessionVersion: 'session-1',
  grantsVersion: 'grant-1', scopeVersion: 'scope-1', incarnation: '1', reviewedAt: s.observedAt!, expiresAt: s.expiresAt!, state: 'OPEN' };
 return evaluatePublishWarningPolicy({ snapshot: s, command, reviewRecord: record, operationRecord: null });
}

describe('F2 isolated deliberate publication review display', () => {
 it('shows exact source-backed advisory notices and observed counts without internal bindings in the user flow', () => {
  const r = ready(), html = render(r);
  expect(html).toContain('Warning count'); expect(html).toContain('>6<');
  for (const warning of r.warnings) { expect(html).toContain(warning.message); expect(html).toContain('>' + warning.count + '<'); }
  expect(html).toContain('Coverage'); expect(html).toContain('Positions'); expect(html).toContain('Designated lead'); expect(html).toContain('Hour targets');
  expect(html).toContain('Checked'); expect(confirmation(html)).not.toContain('disabled'); expect(html).toContain('Return to review');
  for (const hidden of [r.fingerprint, r.reviewId, r.sourceVersion, r.configurationVersion, r.selection.locationId, r.selection.scheduleId!]) expect(html).not.toContain(hidden);
  expect(html).not.toContain('Publish anyway'); expect(html).not.toContain('<form'); expect(html).not.toContain('type="submit"');
 });
 it('offers plain Publish for a fully checked no-warning review without retaining any old reason', () => {
  const html = render(ready(input())); expect(confirmation(html, 'Publish')).not.toContain('disabled');
  expect(html).not.toContain('Publish with these warnings'); expect(html).not.toContain('<textarea');
  expect(html).not.toContain('Reviewed configured shortages'); expect(html).toContain('No advisory warnings in this review');
 });
 it('does not claim unknown checks or null warning counts as checked zero', () => {
  const s = input(); s.readiness.locationCoverage = null; s.readiness.requiresDesignatedLead = null; s.readiness.positionGapBlocks = null;
  s.readiness.hours = { checked: false, underTargetCount: null, overTargetCount: null, unconfiguredTargetCount: null };
  const r = ready(s), html = render(r); expect(r.warnings.every(w => w.count === null)).toBe(true);
  expect(html.match(/Not checked/g)).toHaveLength(4); expect(html).not.toContain('data-warning-count');
  expect(html).not.toContain('No advisory warnings'); expect(html).toContain('Coverage is not checked');
 });
 it('names needs-setup separately from checked and not-checked readiness', () => {
  const s = input(), c = s.readiness.locationCoverage!; c.staffingConfigured = false; c.coverageConfigured = false;
  c.positionRequirementsConfigured = false; c.fullyCovered = false;
  const html = render(ready(s)); expect(html.match(/Needs setup/g)).toHaveLength(3); expect(html).toContain('Hour targets'); expect(html).toContain('Checked');
  expect(html).toContain('Configure minimum staffing'); expect(html).toContain('Configure coverage periods');
 });
 it('marks publication of an existing published schedule as a new revision without changing deliberate button labels', () => {
  const s = input(); s.target.status = 'PUBLISHED'; const r = ready(s); expect(r.publicationKind).toBe('REPUBLISH');
  const html = render(r); expect(html).toContain('new published revision'); expect(confirmation(html, 'Publish')).not.toContain('disabled');
 });
 it.each(['CANONICAL_HARD_FAILURE', 'NO_SCHEDULE'] as const)('canonical %s clears warning material and offers no override', reason => {
  const s = warned(); if (reason === 'CANONICAL_HARD_FAILURE') s.canonical.issues = [{ code: 'SHIFT_OVERLAP', severity: 'error', message: 'PRIVATE HARD FAILURE' }];
  else s.target.status = 'MISSING';
  const r = preparePublishWarningReview(s); expect(r).toMatchObject({ state: 'blocked', reason }); const html = render(r);
  noMutationOrPrivateReview(html); expect(html).not.toContain('PRIVATE HARD FAILURE'); expect(html).not.toContain('SHIFT_OVERLAP');
  expect(html).toContain(reason === 'NO_SCHEDULE' ? 'Save a draft' : 'Cannot publish'); expect(html).toContain('Return to review');
 });
 it.each(['INVALID_INPUT', 'ACCESS_DENIED', 'SOURCE_UNAVAILABLE'] as const)('source %s clears old acknowledgement and confirmation', reason => {
  const s = warned(); if (reason === 'ACCESS_DENIED') s.authority.publishAllowed = false;
  else if (reason === 'SOURCE_UNAVAILABLE') s.sourceComplete = false;
  else s.now = 'not-an-instant';
  const r = preparePublishWarningReview(s); expect(r).toEqual({ state: 'unavailable', reason });
  const html = render(r); noMutationOrPrivateReview(html); expect(html).toContain('unavailable');
 });
 it.each(['loading', 'pending', 'conflict', 'error'] as const)('%s process state never retains a ready review or enables mutation', state => {
  const html = render(ready(), { result: { state } }); noMutationOrPrivateReview(html);
  expect(html).toContain(({ loading: 'Loading publication review', pending: 'Publication outcome is pending', conflict: 'The schedule or review changed', error: 'Publication could not be confirmed' })[state]);
 });
 it.each([
  [{ published: true, revisionId: 'private-revision-id', revisionNumber: 2, occurredAt: NOW }, 'Schedule published'],
  [{ published: false, code: 'NOT_COMMITTED' }, 'Publication did not commit'],
  [null, 'Publication outcome is unconfirmed'],
 ] as const)('canonical outcome %j is read-only and cannot publish again', (outcome, message) => {
  const r = ready(), binding = { reviewId: r.reviewId, fingerprint: r.fingerprint, selection: { ...r.selection } };
  const html = render(r, { result: { state: 'outcome', outcome, binding } }); noMutationOrPrivateReview(html);
  expect(html).toContain(message); expect(html).not.toContain('private-revision-id');
 });
 it.each([true, false])('retained %s publication outcome with no observation binding cannot describe the current selection', published => {
  const r = ready(), outcome = published ? { published: true as const, revisionId: 'private-old-revision', revisionNumber: 2, occurredAt: NOW } : { published: false as const, code: 'NOT_COMMITTED' as const };
  const html = render(r, { result: { state: 'outcome', outcome, binding: null } });
  noMutationOrPrivateReview(html); expect(html).not.toContain('Schedule published'); expect(html).not.toContain('Publication did not commit');
  expect(html).toContain('Publication outcome is unconfirmed'); expect(html).toContain('Return to review');
 });
 it.each(['reviewId', 'fingerprint', 'weekStart', 'locationId', 'scheduleId'] as const)('replaced %s hides both retained committed and noncommitted outcomes', field => {
  const r = ready(), binding = { reviewId: r.reviewId, fingerprint: r.fingerprint, selection: { ...r.selection } };
  if (field === 'reviewId' || field === 'fingerprint') binding[field] = 'old-observation'; else binding.selection[field] = 'old-observation';
  for (const outcome of [{ published: true as const, revisionId: 'private-old-revision', revisionNumber: 2, occurredAt: NOW }, { published: false as const, code: 'NOT_COMMITTED' as const }]) {
   const html = render(r, { result: { state: 'outcome', outcome, binding } }); noMutationOrPrivateReview(html);
   expect(html).not.toContain('Schedule published'); expect(html).not.toContain('Publication did not commit');
   expect(html).not.toContain('private-old-revision'); expect(html).toContain('Publication outcome is unconfirmed');
  }
 });
 it('does not infer expiry of a matched immutable outcome from the old review clock', () => {
  const r = ready(), binding = { reviewId: r.reviewId, fingerprint: r.fingerprint, selection: { ...r.selection } };
  const html = render(r, { result: { state: 'outcome', outcome: { published: true, revisionId: 'private-old-revision', revisionNumber: 2, occurredAt: NOW }, binding }, now: '2026-10-09T12:05:00Z' });
  noMutationOrPrivateReview(html); expect(html).toContain('Schedule published'); expect(html).not.toContain('private-old-revision');
 });
 it.each(['loading', 'offline', 'reconnecting', 'unavailable', 'access_lost', 'paused'] as const)('%s connection suppresses old warning counts, reason and confirmation', connection => {
  const html = render(ready(), { connection }); noMutationOrPrivateReview(html); expect(html).toContain('unconfirmed');
 });
 it.each(['reviewId', 'fingerprint', 'weekStart', 'locationId', 'scheduleId'] as const)('changed expected %s suppresses the previous review and reason', field => {
  const r = ready(), expected = { reviewId: r.reviewId, fingerprint: r.fingerprint, selection: { ...r.selection } };
  if (field === 'reviewId' || field === 'fingerprint') expected[field] = 'replacement'; else expected.selection[field] = 'replacement';
  const html = render(r, { expected }); noMutationOrPrivateReview(html); expect(html).toContain('Return to review');
 });
 it.each([
  ['2026-10-09T12:00:00.123455Z', true], ['2026-10-09T12:00:00.123456Z', false], ['2026-10-09T12:00:00.123457Z', false],
 ] as const)('native precision expiry %s retains deliberate controls only while strictly current (%s)', (now, current) => {
  const s = warned(); s.now = '2026-10-09T12:00:00.123400Z'; s.observedAt = s.now;
  s.expiresAt = '2026-10-09T12:00:00.123456Z'; s.authority.expiresAt = s.expiresAt;
  const html = render(ready(s), { now }); if (current) expect(confirmation(html)).not.toContain('disabled'); else noMutationOrPrivateReview(html);
 });
 it.each(['not-an-instant', '2026-10-09T12:00:00+99:99'])('malformed explicit time %s suppresses private review', now => {
  noMutationOrPrivateReview(render(ready(), { now }));
 });
 it.each(['', 'not-an-instant'])('malformed ready expiry %s never enables confirmation', expiresAt => {
  noMutationOrPrivateReview(render({ ...ready(), expiresAt }));
 });
 it('does not expose enabled confirmation or return buttons without their intent callbacks', () => {
  const html = render(ready(), { onConfirm: undefined, onReturnToReview: undefined });
  expect(confirmation(html)).toContain('disabled=""'); expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Return to review<\/button>/);
 });
 it('does not infer confirmation permission from warnings when the canonical choice is absent', () => {
  const html = render({ ...ready(), choices: ['RETURN_TO_REVIEW'] }); expect(confirmation(html)).toContain('disabled=""');
 });
});

describe('F2 reason input is presentation validation, not server publication authority', () => {
 it.each([
  ['empty', '', false], ['whitespace', '   \n ', false], ['one visible codepoint', '✓', true],
  ['500 ASCII codepoints', 'a'.repeat(500), true], ['501 ASCII codepoints', 'a'.repeat(501), false],
  ['500 emoji codepoints', '😀'.repeat(500), true], ['501 emoji codepoints', '😀'.repeat(501), false],
  ['surrounding whitespace', '  ' + '😀'.repeat(500) + ' \n', true],
  ['combining marks only', '\u0301'.repeat(3), false], ['emoji with joiners', '👩\u200d💻', true],
  ['readable CRLF', 'Reviewed\r\ncoverage', true], ['readable lone CR', 'Reviewed\rcoverage', true],
  ['null', 'reason\u0000', false], ['tab before trim', '\tReviewed\t', false], ['BOM before trim', '\ufeffReviewed', false],
  ['bidi override', 'Reviewed\u202e', false], ['zero-width-only', '\u200b', false], ['lone surrogate', '\ud800', false],
 ] as const)('%s reason gates only the deliberate warning button (%s)', (_name, reason, valid) => {
  const s = warned(), decision = policyReason(s, reason);
  expect(decision.state).toBe(valid ? 'ALLOW_NEW' : 'DENY');
  if (!valid) expect(decision).toEqual({ state: 'DENY', reason: 'INVALID_REASON' });
  const html = render(ready(s), { reason }), button = confirmation(html);
  expect(button.includes('disabled=""')).toBe(!valid);
  expect(html).toContain('Reason for publishing with warnings'); expect(html).toContain('aria-describedby=');
  expect(html).not.toContain('maxLength='); expect(html).not.toContain('maxlength=');
  if (!valid) expect(html).toContain('Enter a readable reason of 1–500 characters');
 });
 it('keeps raw controlled input and displays the trimmed codepoint count without changing parent state during render', () => {
  const html = render(ready(), { reason: '  😀  ' });
  expect(html).toContain('  😀  </textarea>'); expect(html).toContain('1 / 500'); expect(html).not.toContain('5 / 500');
  expect(html).toContain('<label'); expect(html).toContain('required=""');
 });
});
