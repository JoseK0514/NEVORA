import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { buildActionIntelligence } from '../lib/action-center/intelligence';
import type { ActionFact, ActionIntelligenceInput, ActionIntelligenceResult, SourceKey } from '../lib/action-center/intelligence';
import { preparePublishWarningReview } from '../lib/scheduling/publish-warning-policy';
import type { PublishWarningReview, PublishWarningSnapshot } from '../lib/scheduling/publish-warning-policy';
import type { ActionIntelligenceSurfaceProps } from './manager-action-center';
import type { PublishWarningReviewSurfaceProps } from './publish-warning-review-surface';
import { ReviewedActionIntelligenceView, ReviewedPublishWarningView } from './manager-reviewed-views';
import type { PublishReviewDisplayBinding, ReviewedActionIntelligenceViewProps,
  ReviewedPublishWarningViewProps, ReviewedViewObservation } from './manager-reviewed-views';

// UNEXECUTED preparation. These fictional pure-policy inputs are ordinary
// observations, not authenticated proof, an actual reader or installed grants.
// All displayed DTOs below are produced by the accepted canonical projectors.
const NOW = '2026-10-09T12:00:00Z';
const WEEK = '2026-10-05';
const VIEW_FIELDS = ['workspaceId', 'actorId', 'role', 'sessionVersion', 'grantsVersion',
  'scopeVersion', 'incarnation', 'viewId'] as const;
function viewer(): ReviewedViewObservation {
  return { workspaceId: 'tenant-a', actorId: 'manager', role: 'MANAGER', sessionVersion: 'session-2',
    grantsVersion: 'grants-3', scopeVersion: 'scope-4', incarnation: '9007199254740993', viewId: 'view-5' };
}
function intelligenceInput(): ActionIntelligenceInput {
  const v = viewer(), binding = { workspaceId: v.workspaceId, actorId: v.actorId, role: v.role,
    sessionVersion: v.sessionVersion, grantsVersion: v.grantsVersion, scopeVersion: v.scopeVersion,
    viewId: v.viewId, weekStart: WEEK };
  const versions = { scheduling: 's1', attendance: 'a1', corrections: 'c1', timecards: 't1' };
  const keys: SourceKey[] = ['scheduling', 'attendance', 'corrections', 'timecards'];
  return { context: { ...binding, now: NOW, authorityExpiresAt: '2026-10-09T12:00:40Z', online: true,
    workforceActive: true, portalState: 'ENABLED', workspaceActive: true, membershipCurrent: true,
    sessionCurrent: true, grantsCurrent: true, actionCenterReadAllowed: true, timeZone: 'America/Puerto_Rico',
    administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['a'] }, selectedLocationIds: ['a'],
    locations: [{ id: 'a', workspaceId: 'tenant-a', active: true }], expectedSourceVersions: versions },
    sources: keys.map(source => ({ source, state: 'ready', binding: { ...binding }, version: versions[source],
      observedAt: NOW, expiresAt: '2026-10-09T12:00:30Z', coverage: 'complete', rows: [] })) };
}
function requestFact(): ActionFact {
  return { kind: 'REQUEST', meta: { id: 'TIME_OFF:request', workspaceId: 'tenant-a',
    version: '1', currentVersion: '1', state: 'ACTIONABLE', footprintComplete: true, locationIds: ['a'],
    subjectIds: ['employee'], readAllowed: true, destinationAllowed: true, permittedFields: ['employee.identity', 'request'],
    deadlineAt: null, startAt: null, sourceTimestamp: null },
    payload: { id: 'request', kind: 'TIME_OFF', employeeId: 'employee', employeeName: 'Fictional person', createdAt: NOW } };
}
function intelligence(withRow = true): ActionIntelligenceResult {
  const source = intelligenceInput(), scheduling = source.sources[0];
  if (scheduling.state !== 'ready') throw Error('Canonical fixture setup');
  if (withRow) scheduling.rows.push(requestFact());
  const result = buildActionIntelligence(source);
  expect(result.state, 'genuine canonical projection fixture').toBe('ready');
  return result;
}
function actionProps(snapshot = intelligence()): ReviewedActionIntelligenceViewProps {
  return { observation: { binding: viewer(), snapshot }, expected: viewer(), sourceCurrent: true,
    connection: 'ready', weekStart: WEEK, expectedLocationIds: ['a'], now: NOW, onRefresh: vi.fn(), onRetrySource: vi.fn(), onExpand: vi.fn() };
}
function actionHtml(props: ReviewedActionIntelligenceViewProps) {
  const html = renderToStaticMarkup(createElement(ReviewedActionIntelligenceView, props));
  for (const cb of [props.onRefresh, props.onRetrySource, props.onExpand]) if (cb) expect(cb).not.toHaveBeenCalled();
  return html;
}
function noActions(html: string) {
  expect(html).not.toContain('data-action-id'); expect(html).not.toContain('Observed actions');
  expect(html).not.toContain('Fictional person'); expect(html).not.toContain('Source version');
  expect(html).not.toContain('No actions need review'); expect(html).not.toContain('data-action-source');
}

type PublishSource = PublishWarningSnapshot & { target: NonNullable<PublishWarningSnapshot['target']>;
  readiness: NonNullable<PublishWarningSnapshot['readiness']>; canonical: NonNullable<PublishWarningSnapshot['canonical']> };
function publishInput(warnings = true): PublishSource {
  const v = viewer();
  return { namespace: { workspaceId: v.workspaceId, actorId: v.actorId, purpose: 'SCHEDULE_PUBLISH',
      operationId: '10000000-0000-4000-8000-000000000001' },
    authority: { role: v.role, workspaceActive: true, workforceActive: true, portalState: 'ENABLED',
      membershipCurrent: true, sessionCurrent: true, grantsCurrent: true, publishAllowed: true, receiptReadAllowed: true,
      sessionVersion: v.sessionVersion, grantsVersion: v.grantsVersion, scopeVersion: v.scopeVersion,
      incarnation: v.incarnation, expiresAt: '2026-10-09T12:01:00Z',
      administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['a'] } },
    selection: { weekStart: WEEK, locationId: 'a', scheduleId: 'fictional-schedule' },
    locations: [{ id: 'a', workspaceId: 'tenant-a', active: true }], now: NOW, observedAt: NOW,
    expiresAt: '2026-10-09T12:00:30Z', reviewId: 'review-1', sourceVersion: 'source-1', configurationVersion: 'config-1',
    sourceCurrent: true, sourceComplete: true, footprintComplete: true, affectedLocationIds: ['a'], readAllowed: true,
    permittedFields: ['schedule', 'readiness', 'configuration'], target: { status: 'DRAFT', shiftCount: 0 },
    canonical: { checked: true, allowed: true, issues: [] }, readiness: { locationCoverage: {
      locationId: 'a', locationName: 'Fictional location', totalBlocks: 7, coveredBlocks: warnings ? 5 : 7,
      uncoveredBlocks: warnings ? 2 : 0, missingLeadBlocks: 0, fullyCovered: !warnings, staffingConfigured: true,
      coverageConfigured: true, positionRequirementsConfigured: true }, requiresDesignatedLead: false, positionGapBlocks: 0,
      hours: { checked: true, underTargetCount: 0, overTargetCount: 0, unconfiguredTargetCount: 0 } } };
}
function review(source = publishInput()): Extract<PublishWarningReview, { state: 'ready' }> {
  const result = preparePublishWarningReview(source);
  expect(result.state, 'genuine canonical publication fixture').toBe('ready');
  if (result.state !== 'ready') throw Error('Canonical review fixture setup'); return result;
}
function publishProps(r = review()): ReviewedPublishWarningViewProps {
  const binding: PublishReviewDisplayBinding = { viewer: viewer(), operationId: publishInput().namespace.operationId,
    review: { reviewId: r.reviewId, fingerprint: r.fingerprint, selection: { ...r.selection } } };
  return { expected: structuredClone(binding), observation: { binding: structuredClone(binding), result: { state: 'review', review: r } },
    sourceCurrent: true, connection: 'ready', now: NOW, reason: { binding: structuredClone(binding), value: '  Reviewed coverage  ' },
    onReasonChange: vi.fn(), onPublishIntent: vi.fn(), onReturnToReview: vi.fn() };
}
function publishHtml(props: ReviewedPublishWarningViewProps) {
  const html = renderToStaticMarkup(createElement(ReviewedPublishWarningView, props));
  for (const cb of [props.onReasonChange, props.onPublishIntent, props.onReturnToReview]) if (cb) expect(cb).not.toHaveBeenCalled();
  return html;
}
function confirmation(html: string, label = 'Publish with these warnings') {
  const button = html.match(new RegExp('<button[^>]*>' + label + '</button>'))?.[0];
  expect(button, 'deliberate native button').toBeDefined(); return button!;
}
function noPrivateReview(html: string) {
  for (const fragment of ['data-warning-code', 'Warning count', '<textarea', 'Reviewed coverage', 'Publish with these warnings',
    'Schedule published.', 'Publication did not commit.', 'fictional-schedule']) expect(html).not.toContain(fragment);
  expect(html).not.toMatch(/>Publish<\/button>/);
}
function committed(props: ReviewedPublishWarningViewProps) {
  if (!props.observation) throw Error('Fixture observation missing');
  props.observation.result = { state: 'outcome', binding: structuredClone(props.expected.review),
    outcome: { published: true, revisionId: 'private-revision', revisionNumber: 2, occurredAt: NOW } };
}
function childProps(props: ReviewedPublishWarningViewProps): PublishWarningReviewSurfaceProps {
  // Explicit wrapper-event wiring probe only, not browser dispatch or authority.
  return ReviewedPublishWarningView(props).props;
}

describe('Unused F1 reviewed view preserves canonical projection', () => {
  it('passes the exact projected DTO, reason, version, timestamp and destination without rendering-driven reads', () => {
    const props = actionProps(), snapshot = props.observation!.snapshot;
    if (snapshot?.state !== 'ready') throw Error('Fixture ready');
    const child: ActionIntelligenceSurfaceProps = ReviewedActionIntelligenceView(props).props;
    expect(child.snapshot).toBe(snapshot);
    const html = actionHtml(props), item = snapshot.items[0];
    expect(html).toContain('Observed actions'); expect(html).toContain(item.reason.text);
    expect(html).toContain(item.sourceVersion); expect(html).toContain(item.observedAt);
    expect(html).toContain(item.nextAction.label); expect(html).toContain(item.nextAction.href.replaceAll('&', '&amp;'));
  });
  it('retains named failed sections and observed known rows rather than claiming all-clear', () => {
    const props = actionProps(), input = intelligenceInput();
    const scheduling = input.sources[0]; if (scheduling.state !== 'ready') throw Error('Fixture ready source');
    scheduling.rows.push(requestFact());
    input.sources[1] = { source: 'attendance', binding: input.sources[1].binding, state: 'unavailable', reason: 'READ_FAILED' };
    props.observation!.snapshot = buildActionIntelligence(input);
    expect(props.observation!.snapshot.state).toBe('partial'); const html = actionHtml(props);
    expect(html).toContain('Fictional person'); expect(html).toContain('Action results are incomplete');
    expect(html).toContain('Read unavailable'); expect(html).toContain('Retry Attendance'); expect(html).not.toContain('No actions need review');
  });
  it.each(['loading', 'capped'] as const)('empty %s source cannot become all-clear', state => {
    const input = intelligenceInput();
    if (state === 'loading') input.sources[0] = { source: 'scheduling', binding: input.sources[0].binding, state: 'loading' };
    else if (input.sources[0].state === 'ready') input.sources[0].coverage = 'capped';
    const snapshot = buildActionIntelligence(input); expect(snapshot.allClear).toBe(false);
    const html = actionHtml(actionProps(snapshot)); expect(html).not.toContain('No actions need review');
    expect(html).toContain(state === 'loading' ? 'Loading' : 'Incomplete source');
  });
  it('reserves all-clear for the canonical fully complete empty projection', () => {
    expect(actionHtml(actionProps(intelligence(false)))).toContain('No actions need review in this authorized view');
  });
  it.each(VIEW_FIELDS)('clears rows/counts/source statuses on outer %s drift', field => {
    const props = actionProps(); props.observation!.binding = { ...viewer(), [field]: field === 'role' ? 'OWNER' : 'different' };
    noActions(actionHtml(props));
    const child: ActionIntelligenceSurfaceProps = ReviewedActionIntelligenceView(props).props;
    expect(child.onRetrySource).toBeUndefined(); expect(child.onExpand).toBeUndefined();
  });
  it.each(['loading', 'offline', 'reconnecting', 'unavailable', 'access_lost', 'paused'] as const)('%s connection hides the old projection and all callbacks', connection => {
    const props = actionProps(); props.connection = connection; noActions(actionHtml(props));
    const child: ActionIntelligenceSurfaceProps = ReviewedActionIntelligenceView(props).props;
    expect(child.onRefresh).toBeUndefined(); expect(child.onRetrySource).toBeUndefined(); expect(child.onExpand).toBeUndefined();
  });
  it('suppresses missing binding and source-current loss without deriving access from role', () => {
    const props = actionProps(); props.observation!.binding = null; noActions(actionHtml(props));
    props.observation!.binding = viewer(); props.sourceCurrent = false; noActions(actionHtml(props));
    props.observation = null; noActions(actionHtml(props));
  });
  it('suppresses the entire view on changed/duplicate location selection instead of filtering rows or recomputing counts', () => {
    const props = actionProps();
    for (const selected of [['b'], ['a', 'a'], [], ['a', 'b']]) {
      props.expectedLocationIds = selected; noActions(actionHtml(props));
      const child: ActionIntelligenceSurfaceProps = ReviewedActionIntelligenceView(props).props;
      expect(child.snapshot).toBeNull(); expect(child.onRetrySource).toBeUndefined();
    }
  });
  it('keeps the existing exact week/view and native-precision expiry checks', () => {
    const props = actionProps(); props.weekStart = '2026-10-12'; noActions(actionHtml(props)); props.weekStart = WEEK;
    if (props.observation!.snapshot?.state !== 'ready') throw Error('Fixture ready');
    props.observation!.snapshot = { ...props.observation!.snapshot, validUntil: '2026-10-09T12:00:00.123456Z' };
    props.now = '2026-10-09T12:00:00.123455Z'; expect(actionHtml(props)).toContain('Observed actions');
    for (const now of ['2026-10-09T12:00:00.123456Z', '2026-10-09T12:00:00.123457Z', 'invalid']) {
      props.now = now; noActions(actionHtml(props));
    }
  });
});

describe('Unused F2 reviewed view binds controlled state without constructing commands', () => {
  it('passes the canonical review unchanged and keeps raw controlled reason until deliberate intent', () => {
    const props = publishProps(), child = childProps(props);
    expect(child.result).toBe(props.observation!.result); expect(child.expected).toBe(props.expected.review);
    expect(child.reason).toBe('  Reviewed coverage  '); expect(confirmation(publishHtml(props))).not.toContain('disabled');
  });
  it.each(VIEW_FIELDS)('outer %s drift clears ready warnings/reason and retained outcome', field => {
    const props = publishProps(); props.observation!.binding!.viewer = { ...viewer(), [field]: field === 'role' ? 'OWNER' : 'different' };
    noPrivateReview(publishHtml(props)); committed(props); noPrivateReview(publishHtml(props));
    expect(childProps(props).onConfirm).toBeUndefined();
  });
  it.each(['operationId', 'reviewId', 'fingerprint', 'weekStart', 'locationId', 'scheduleId'] as const)('%s replacement suppresses retained ready and outcome state', field => {
    const props = publishProps(), binding = props.observation!.binding!;
    if (field === 'operationId') binding.operationId = '10000000-0000-4000-8000-000000000002';
    else if (field === 'reviewId' || field === 'fingerprint') binding.review[field] = 'different';
    else binding.review.selection[field] = 'different';
    noPrivateReview(publishHtml(props)); committed(props); noPrivateReview(publishHtml(props));
  });
  it.each(['operationId', 'reviewId', 'fingerprint', 'weekStart', 'locationId', 'scheduleId'] as const)('old %s reason cannot acknowledge a new current review', field => {
    const props = publishProps(), binding = props.reason!.binding!;
    if (field === 'operationId') binding.operationId = '10000000-0000-4000-8000-000000000002';
    else if (field === 'reviewId' || field === 'fingerprint') binding.review[field] = 'different';
    else binding.review.selection[field] = 'different';
    const html = publishHtml(props); expect(html).toContain('data-warning-code'); expect(html).not.toContain('Reviewed coverage');
    expect(confirmation(html)).toContain('disabled'); expect(childProps(props).reason).toBe('');
  });
  it.each(VIEW_FIELDS)('an old %s reason cannot acknowledge a current namespace/view', field => {
    const props = publishProps(); props.reason!.binding!.viewer = { ...viewer(), [field]: field === 'role' ? 'OWNER' : 'different' };
    const html = publishHtml(props); expect(html).toContain('data-warning-code'); expect(html).not.toContain('Reviewed coverage');
    expect(confirmation(html)).toContain('disabled'); expect(childProps(props).reason).toBe('');
  });
  it('clears missing reason binding and missing observation independently', () => {
    const props = publishProps(); props.reason!.binding = null;
    expect(confirmation(publishHtml(props))).toContain('disabled'); expect(childProps(props).reason).toBe('');
    props.observation!.binding = null; noPrivateReview(publishHtml(props)); props.observation = null; noPrivateReview(publishHtml(props));
  });
  it.each(['loading', 'offline', 'reconnecting', 'unavailable', 'access_lost', 'paused'] as const)('%s connection suppresses ready/outcome and user intents', connection => {
    const props = publishProps(); props.connection = connection; noPrivateReview(publishHtml(props));
    committed(props); noPrivateReview(publishHtml(props)); expect(childProps(props).onConfirm).toBeUndefined();
    expect(childProps(props).onReturnToReview).toBeUndefined();
  });
  it('hides source-stale ready material while preserving matching pending original-attempt guidance', () => {
    const props = publishProps(); props.sourceCurrent = false; noPrivateReview(publishHtml(props));
    props.observation!.result = { state: 'pending' }; const html = publishHtml(props);
    noPrivateReview(html); expect(html).toContain('Check the original attempt'); expect(childProps(props).onConfirm).toBeUndefined();
  });
  it('preserves a matched immutable old outcome across source advance and past review clock, with no command intent', () => {
    const props = publishProps(); committed(props); props.sourceCurrent = false; props.now = '2026-10-10T12:00:00Z';
    const html = publishHtml(props); expect(html).toContain('Schedule published.'); expect(html).not.toContain('private-revision');
    expect(html).not.toContain('<textarea'); expect(html).not.toContain('data-warning-code'); expect(childProps(props).onConfirm).toBeUndefined();
  });
  it('retains the existing corrected inner outcome matcher rather than trusting an outer match alone', () => {
    const props = publishProps(); committed(props); const outcome = props.observation!.result;
    if (outcome.state !== 'outcome') throw Error('Outcome fixture'); outcome.binding!.selection.locationId = 'old-location';
    const html = publishHtml(props); expect(html).not.toContain('Schedule published.'); expect(html).toContain('outcome is unconfirmed');
  });
  it.each(['loading', 'pending', 'conflict', 'error'] as const)('%s process state does not carry controlled reason or confirmation', state => {
    const props = publishProps(); props.observation!.result = { state };
    noPrivateReview(publishHtml(props)); expect(childProps(props).onConfirm).toBeUndefined(); expect(childProps(props).reason).toBe('');
  });
  it('plain no-warning Publish retains no previous reason and is disabled if protected intent callback is absent', () => {
    const props = publishProps(review(publishInput(false))); const html = publishHtml(props);
    expect(confirmation(html, 'Publish')).not.toContain('disabled'); expect(html).not.toContain('<textarea'); expect(html).not.toContain('Reviewed coverage');
    props.onPublishIntent = undefined; expect(confirmation(publishHtml(props), 'Publish')).toContain('disabled');
  });
  it.each([500, 501])('the existing server-parity surface counts %s Unicode codepoints without a new local reason policy', length => {
    const props = publishProps(); props.reason!.value = '😀'.repeat(length);
    expect(confirmation(publishHtml(props)).includes('disabled')).toBe(length === 501);
  });
  it('delegates exact expiry/equality to the existing surface and cannot keep stale reason controls', () => {
    const props = publishProps(); props.now = '2026-10-09T12:00:30Z'; noPrivateReview(publishHtml(props));
  });
  it('canonical hard-block result remains blocked without manufacturing an override', () => {
    const props = publishProps(), source = publishInput();
    source.canonical.issues = [{ code: 'SHIFT_OVERLAP', severity: 'error', message: 'PRIVATE HARD FAILURE' }];
    props.observation!.result = { state: 'review', review: preparePublishWarningReview(source) };
    const html = publishHtml(props); noPrivateReview(html); expect(html).toContain('Cannot publish'); expect(html).not.toContain('PRIVATE HARD FAILURE');
  });
  it('emits only explicit detached display intents; no callbacks during render, hidden source fields or command construction', () => {
    const props = publishProps(), original = structuredClone(props.expected), child = childProps(props);
    props.expected.viewer.scopeVersion = 'later-scope'; props.expected.review.selection.locationId = 'later-location';
    child.onReasonChange('new raw text'); expect(props.onReasonChange).toHaveBeenCalledWith({ binding: original, value: 'new raw text' });
    child.onConfirm!({ choice: 'PUBLISH_WITH_WARNINGS', reason: 'Reviewed coverage' });
    expect(props.onPublishIntent).toHaveBeenCalledWith({ binding: original, choice: 'PUBLISH_WITH_WARNINGS', reason: 'Reviewed coverage' });
    child.onReturnToReview!(); expect(props.onReturnToReview).toHaveBeenCalledWith(original);
    const intent = vi.mocked(props.onPublishIntent!).mock.calls[0][0];
    expect(Object.keys(intent).sort()).toEqual(['binding', 'choice', 'reason']);
    expect(intent.binding).not.toBe(original); expect(intent.binding.viewer).not.toBe(props.expected.viewer);
    expect(intent.binding.review.selection).not.toBe(props.expected.review.selection);
    // A late event retains its original observation. It cannot become current
    // authority; the protected server/controller must reject it after drift.
  });
});
