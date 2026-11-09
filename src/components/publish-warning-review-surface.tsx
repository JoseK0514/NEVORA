'use client';

import { useId } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import type { PublishSafeOutcome, PublishSelection, PublishWarningReview } from '../lib/scheduling/publish-warning-policy';

type Connection = 'ready' | 'loading' | 'offline' | 'reconnecting' | 'unavailable' | 'access_lost' | 'paused';
export type PublishWarningReviewObservationBinding = { reviewId: string; fingerprint: string; selection: PublishSelection };
export type PublishWarningReviewSurfaceResult =
 | { state: 'review'; review: PublishWarningReview | null }
 | { state: 'loading' | 'pending' | 'conflict' | 'error' }
 | { state: 'outcome'; outcome: PublishSafeOutcome | null; binding: PublishWarningReviewObservationBinding | null };
export type PublishWarningReviewSurfaceProps = {
 result: PublishWarningReviewSurfaceResult;
 connection: Connection;
 /** Observation matching only. The protected adapter must derive the current
  * namespace, review/operation records and selection under canonical locks. */
 expected: PublishWarningReviewObservationBinding;
 now: string;
 /** Controlled raw text for this expected review. The adapter must clear it
  * on review replacement; rendering never changes parent state automatically. */
 reason: string;
 onReasonChange: (value: string) => void;
 onConfirm?: (intent: { choice: 'PUBLISH' | 'PUBLISH_WITH_WARNINGS'; reason: string }) => void;
 onReturnToReview?: () => void;
};

/** Unused F2 display preparation. No policy runtime import (node:crypto),
 * authority constructor, submitter, reader, retry or publication engine.
 * Callback intents and explicit time/view observations never authorize writes;
 * canonical server validation and full F10/F6/F5 integration remain required. */
export function PublishWarningReviewSurface({ result, connection, expected, now, reason,
 onReasonChange, onConfirm, onReturnToReview }: PublishWarningReviewSurfaceProps) {
 const fieldId = useId(), helpId = fieldId + '-help';
 const review = result.state === 'review' ? result.review : null;
 const candidate = review?.state === 'ready' ? review : null;
 const matches = (binding: PublishWarningReviewObservationBinding | null | undefined) => !!binding &&
  binding.reviewId === expected.reviewId && binding.fingerprint === expected.fingerprint &&
  binding.selection?.weekStart === expected.selection.weekStart && binding.selection?.locationId === expected.selection.locationId &&
  binding.selection?.scheduleId === expected.selection.scheduleId;
 let current = false;
 if (connection === 'ready' && candidate && matches(candidate)) {
  try { current = Temporal.Instant.compare(Temporal.Instant.from(now), Temporal.Instant.from(candidate.expiresAt)) < 0; }
  catch { current = false; }
 }
 const ready = current ? candidate : null, warnings = !!ready?.warnings.length;
 // Presentation-only parity with the approved server reason contract. CRLF
 // normalizes before validation; unsafe raw normalized text cannot be hidden
 // by trimming. Codepoint counting must not truncate valid emoji as UTF16.
 const normalized = reason.replace(/\r\n?/g, '\n'), trimmed = normalized.trim();
 const characters = [...trimmed].length;
 const unsafe = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200b\u200e\u200f\u2028-\u202e\u2060-\u206f\ufeff\ud800-\udfff]/u;
 const readable = !unsafe.test(normalized) && characters >= 1 && characters <= 500 && /[^\p{White_Space}\p{C}\p{M}]/u.test(trimmed);
 const choice = warnings ? 'PUBLISH_WITH_WARNINGS' : 'PUBLISH';
 const canConfirm = !!ready && ready.choices.includes(choice) && (!warnings || readable) && !!onConfirm;
 let message = 'Publication review is unavailable. Return to review before publishing.';
 if (connection !== 'ready') message = ({ loading: 'Loading publication review', offline: 'Publication review is unavailable offline',
  reconnecting: 'Reconnecting to publication review', unavailable: 'Publication review is unavailable', access_lost: 'Publication review access ended',
  paused: 'Publication review updates paused' })[connection] + '. The review is unconfirmed.';
 else if (result.state === 'loading') message = 'Loading publication review. The review is unconfirmed.';
 else if (result.state === 'pending') message = 'Publication outcome is pending. Check the original attempt before trying again.';
 else if (result.state === 'conflict') message = 'The schedule or review changed. Return to review before publishing.';
 else if (result.state === 'error') message = 'Publication could not be confirmed. Return to review before trying again.';
 // Receipt matching is only a display observation, never protected recovery
 // authority. Immutable outcomes acquire no expiry from the old review clock.
 else if (result.state === 'outcome') message = !matches(result.binding) || result.outcome === null ?
  'Publication outcome is unconfirmed for this review. Return to review before publishing.' :
  result.outcome.published ? 'Schedule published.' : 'Publication did not commit. Return to review before publishing again.';
 else if (review?.state === 'blocked') message = review.reason === 'NO_SCHEDULE' ? 'Save a draft schedule before publishing.' :
  'Cannot publish while required schedule protections fail. Return to review and resolve them.';
 else if (candidate && !current) message = 'The publication review is no longer current. Return to review before publishing.';
 const labels = { coverage: 'Coverage', positions: 'Positions', lead: 'Designated lead', hours: 'Hour targets' };
 const checkLabels = { CHECKED: 'Checked', NEEDS_SETUP: 'Needs setup', NOT_CHECKED: 'Not checked' };
 return <section className="schedule-publication-controls" aria-label="Review schedule publication" aria-busy={result.state === 'loading' || connection === 'loading'}>
  <h2>Review before publishing</h2>
  {ready ? <div className="schedule-publication-location">
   <div className="schedule-publication-review">
    {ready.publicationKind === 'REPUBLISH' ? <p>Publishing creates a new published revision of this schedule.</p> : null}
    <dl>{(['coverage', 'positions', 'lead', 'hours'] as const).map(check =>
     <div key={check}><dt>{labels[check]}</dt><dd>{checkLabels[ready.checks[check]]}</dd></div>)}</dl>
    {warnings ? <>
     <p>Advisory warnings: <strong aria-label="Warning count">{ready.warnings.length}</strong></p>
     <ul>{ready.warnings.map(warning => <li key={warning.code} data-warning-code={warning.code}>
      {warning.message}{warning.count !== null ? <> Count: <strong data-warning-count={warning.count}>{warning.count}</strong>.</> : null}
     </li>)}</ul>
     <p>Review these warnings before choosing to publish. Required schedule protections still apply.</p>
     <label htmlFor={fieldId}>Reason for publishing with warnings</label>
     <textarea id={fieldId} value={reason} onChange={event => onReasonChange(event.target.value)} required
      aria-describedby={helpId} aria-invalid={!readable} rows={4}
      style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 96, fontSize: 16, lineHeight: 1.5 }}/>
     <p id={helpId} role="status">{characters} / 500 characters. {!readable ? 'Enter a readable reason of 1–500 characters.' : 'This reason accompanies the exact warnings in this review.'}</p>
    </> : <p>No advisory warnings in this review.</p>}
   </div>
   <button className="button secondary compact-button" type="button" disabled={!canConfirm}
    onClick={canConfirm ? () => onConfirm?.({ choice, reason: warnings ? trimmed : '' }) : undefined}>
    {warnings ? 'Publish with these warnings' : 'Publish'}
   </button>
  </div> : <p role="status">{message}</p>}
  <div><button className="button ghost compact-button" type="button" disabled={connection !== 'ready' || !onReturnToReview} onClick={onReturnToReview}>Return to review</button></div>
 </section>;
}
