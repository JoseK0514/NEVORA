'use client';

import { ActionIntelligenceSurface } from './manager-action-center';
import { PublishWarningReviewSurface } from './publish-warning-review-surface';
import type { ActionIntelligenceSurfaceProps } from './manager-action-center';
import type { ActionIntelligenceResult, IntelligenceBinding } from '../lib/action-center/intelligence';
import type { PublishWarningReviewObservationBinding, PublishWarningReviewSurfaceProps,
  PublishWarningReviewSurfaceResult } from './publish-warning-review-surface';

/** Display observations released by a future protected adapter, NOT proof,
 * permission, a revision constructor or an authenticated transport envelope.
 * viewId is the current query/re-entry identity; the adapter changes it when
 * replacing a view. Identifiers/revisions are compared verbatim, never inferred.
 * This unused component accepts sanitized typed DTOs, not raw unknown sources. */
export type ReviewedViewObservation = {
  workspaceId: string;
  actorId: string;
  role: IntelligenceBinding['role'];
  sessionVersion: string;
  grantsVersion: string;
  scopeVersion: string;
  incarnation: string;
  viewId: string;
};
const VIEW_FIELDS = ['workspaceId', 'actorId', 'role', 'sessionVersion', 'grantsVersion',
  'scopeVersion', 'incarnation', 'viewId'] as const;
function sameView(observed: ReviewedViewObservation | null, expected: ReviewedViewObservation): boolean {
  return observed !== null && VIEW_FIELDS.every(field => typeof expected[field] === 'string' &&
    expected[field].length > 0 && observed[field] === expected[field]);
}

export type ReviewedActionIntelligenceViewProps = Omit<ActionIntelligenceSurfaceProps, 'snapshot' | 'expectedViewId'> & {
  observation: { binding: ReviewedViewObservation | null; snapshot: ActionIntelligenceResult | null } | null;
  expected: ReviewedViewObservation;
  /** Exact selected query footprint, not a permission scope or filter. */
  expectedLocationIds: readonly string[];
  /** Presentation-only current-source observation. Cannot grant read access. */
  sourceCurrent: boolean;
};
/** No reader, new action engine, count aggregation, href rewriting or timer.
 * Existing surface owns exact view/week/Temporal expiry and truthful sections.
 * Refresh is a read intent for the CURRENT expected view, never a stale DTO
 * release. Retry/expansion callbacks require a matching current observation. */
export function ReviewedActionIntelligenceView({ observation, expected, expectedLocationIds, sourceCurrent,
  connection, onRefresh, onRetrySource, onExpand, ...display }: ReviewedActionIntelligenceViewProps) {
  const matching = sameView(observation?.binding ?? null, expected);
  const snapshot = observation?.snapshot;
  const candidate = snapshot?.state === 'ready' || snapshot?.state === 'partial' ? snapshot : null;
  const selected = new Set(expectedLocationIds);
  const selectionMatches = candidate === null || selected.size === expectedLocationIds.length &&
    candidate.locationIds.length === expectedLocationIds.length && new Set(candidate.locationIds).size === selected.size &&
    candidate.locationIds.every(id => selected.has(id));
  const released = matching && selectionMatches && sourceCurrent && connection === 'ready';
  return <ActionIntelligenceSurface {...display} connection={connection}
    expectedViewId={expected.viewId} snapshot={released ? observation!.snapshot : null}
    onRefresh={connection === 'ready' && sameView(expected, expected) ? onRefresh : undefined}
    onRetrySource={released ? onRetrySource : undefined} onExpand={released ? onExpand : undefined} />;
}

export type PublishReviewDisplayBinding = {
  viewer: ReviewedViewObservation;
  operationId: string;
  review: PublishWarningReviewObservationBinding;
};
export type PublishReviewReasonObservation = { binding: PublishReviewDisplayBinding | null; value: string };
/** Explicit user intent only. No expected source/configuration revisions,
 * payload digest, authority or PublishWarningCommand is assembled here. */
export type PublishReviewDisplayIntent = {
  binding: PublishReviewDisplayBinding;
  choice: 'PUBLISH' | 'PUBLISH_WITH_WARNINGS';
  reason: string;
};
export type ReviewedPublishWarningViewProps = {
  observation: { binding: PublishReviewDisplayBinding | null; result: PublishWarningReviewSurfaceResult } | null;
  expected: PublishReviewDisplayBinding;
  connection: PublishWarningReviewSurfaceProps['connection'];
  sourceCurrent: boolean;
  now: string;
  reason: PublishReviewReasonObservation | null;
  onReasonChange: (observation: PublishReviewReasonObservation) => void;
  onPublishIntent?: (intent: PublishReviewDisplayIntent) => void;
  onReturnToReview?: (current: PublishReviewDisplayBinding) => void;
};
function sameReview(observed: PublishWarningReviewObservationBinding, expected: PublishWarningReviewObservationBinding): boolean {
  return typeof expected.reviewId === 'string' && expected.reviewId.length > 0 &&
    typeof expected.fingerprint === 'string' && expected.fingerprint.length > 0 &&
    typeof expected.selection.weekStart === 'string' && expected.selection.weekStart.length > 0 &&
    typeof expected.selection.locationId === 'string' && expected.selection.locationId.length > 0 &&
    (expected.selection.scheduleId === null || typeof expected.selection.scheduleId === 'string' && expected.selection.scheduleId.length > 0) &&
    observed.reviewId === expected.reviewId && observed.fingerprint === expected.fingerprint &&
    observed.selection.weekStart === expected.selection.weekStart && observed.selection.locationId === expected.selection.locationId &&
    observed.selection.scheduleId === expected.selection.scheduleId;
}
function samePublishView(observed: PublishReviewDisplayBinding | null, expected: PublishReviewDisplayBinding): boolean {
  return observed !== null && sameView(observed.viewer, expected.viewer) &&
    typeof expected.operationId === 'string' && expected.operationId.length > 0 && observed.operationId === expected.operationId &&
    sameReview(observed.review, expected.review);
}
function copyPublishBinding(binding: PublishReviewDisplayBinding): PublishReviewDisplayBinding {
  const v = binding.viewer;
  return { viewer: { workspaceId: v.workspaceId, actorId: v.actorId, role: v.role, sessionVersion: v.sessionVersion,
    grantsVersion: v.grantsVersion, scopeVersion: v.scopeVersion, incarnation: v.incarnation, viewId: v.viewId },
    operationId: binding.operationId, review: { reviewId: binding.review.reviewId, fingerprint: binding.review.fingerprint,
      selection: { weekStart: binding.review.selection.weekStart, locationId: binding.review.selection.locationId,
        scheduleId: binding.review.selection.scheduleId } } };
}
/** Unused view wrapper; never fetches/submits/retries or authorizes publication.
 * Namespace/re-entry drift suppresses every old result, including an outcome.
 * A matched immutable original outcome may survive source advance: it is NOT
 * expired by a past review clock or sourceCurrent=false. Bound pending/conflict/
 * error/loading messages likewise contain no ready warning/reason data. Current authenticated
 * receipt access remains the protected adapter's prerequisite.
 * Raw reason is controlled and separately bound. Rendering a replacement
 * never changes parent state automatically or carries an old acknowledgement.
 * Events carry a detached binding captured at render; the server must reject
 * late intents after invalidation, not trust these ordinary display fields. */
export function ReviewedPublishWarningView({ observation, expected, connection, sourceCurrent, now, reason,
  onReasonChange, onPublishIntent, onReturnToReview }: ReviewedPublishWarningViewProps) {
  const matching = samePublishView(observation?.binding ?? null, expected);
  const processOrOutcome = observation !== null && observation.result.state !== 'review';
  const released = connection === 'ready' && matching && (sourceCurrent || processOrOutcome);
  const eventBinding = copyPublishBinding(expected);
  const result: PublishWarningReviewSurfaceResult = released ? observation!.result : { state: 'review', review: null };
  const currentReview = released && sourceCurrent && result.state === 'review' && result.review?.state === 'ready';
  const reasonMatches = currentReview && samePublishView(reason?.binding ?? null, expected);
  return <PublishWarningReviewSurface result={result} expected={expected.review} connection={connection} now={now}
    reason={reasonMatches ? reason!.value : ''}
    onReasonChange={value => onReasonChange({ binding: copyPublishBinding(eventBinding), value })}
    onConfirm={currentReview && onPublishIntent ? intent => onPublishIntent({ binding: copyPublishBinding(eventBinding), choice: intent.choice, reason: intent.reason }) : undefined}
    onReturnToReview={connection === 'ready' && onReturnToReview ? () => onReturnToReview(copyPublishBinding(eventBinding)) : undefined} />;
}
