'use client';

import type { ReactNode } from 'react';
import { addDays } from '../lib/date-utils';
import type { GenerationExplanationBinding, GenerationExplanationView } from '../lib/scheduling/generation/explanation-view';

type ReadyView = Extract<GenerationExplanationView, { state: 'ready' }>;
type Connection = 'ready' | 'loading' | 'offline' | 'reconnecting' | 'unavailable' | 'access_lost' | 'paused';
export type GenerationExplanationObservationBinding = GenerationExplanationBinding & {
 weekStart: string;
 mode: ReadyView['mode'];
};
export type GenerationExplanationPanelResult =
 | { state: 'view'; view: GenerationExplanationView | null; binding: GenerationExplanationObservationBinding | null }
 | { state: 'loading' | 'error' };
export type GenerationExplanationPanelProps = {
 result: GenerationExplanationPanelResult;
 connection: Connection;
 expected: GenerationExplanationObservationBinding;
 /** Current protected-adapter observation, never read/write authority. The
  * adapter must invalidate it on access, source or view changes and re-entry. */
 sourceCurrent: boolean;
 onLookupOriginalOutcome?: (intent: { generationId: string; operationId: string }) => void;
};

const bindingFields = ['workspaceId', 'actorId', 'purpose', 'operationId', 'generationId', 'sourceVersion', 'inputVersion',
 'configurationVersion', 'strategyVersion', 'sessionVersion', 'grantsVersion', 'scopeVersion', 'incarnation', 'weekStart', 'mode'] as const;
const readyFields = ['generationId', 'sourceVersion', 'inputVersion', 'configurationVersion', 'strategyVersion', 'weekStart', 'mode'] as const;
const statusLabels = {
 COMPLETE: 'Complete for the attempted locations.',
 PARTIAL: 'Partial plan. Unresolved gaps remain.',
 BUDGET_EXHAUSTED: 'Search budget exhausted. This plan may have remaining gaps.',
 INVALID: 'Setup needs review. No valid plan was generated.',
};
const nextLabels = {
 REVIEW_PLAN: 'Review this plan before saving.',
 REVIEW_DRAFT: 'Review the saved draft.',
 REVIEW_SETUP: 'Review location setup.',
};

function Disclosure({ title, children }: { title: string; children: ReactNode }) {
 return <details className="schedule-publication-change shift-policy-disclosure shift-change-history">
  <summary>{title}</summary>{children}
 </details>;
}
function Assignments({ rows, empty }: { rows: ReadyView['accepted']; empty: string }) {
 return rows.length ? <ul>{rows.map(row => <li key={row.assignmentId} data-assignment-id={row.assignmentId}>
  <strong>{row.employeeId} · {row.locationId}</strong>
  {/* Canonical HH:MM rows use the following business day for implicit
    overnight endpoints. Keep explicit dates and end-of-day 24:00 notation. */}
  <span>{row.date} {row.startTime} – {row.endDate ?? (row.endTime < row.startTime ? addDays(row.date, 1) : row.date)} {row.endTime}</span>
  <span>Assignment: {row.assignmentId}{row.positionId !== undefined ? <> · Position: {row.positionId}</> : null}
   {row.isDesignatedLead ? ' · Designated lead' : ''}</span>
  <span>{row.message}</span>
  <span>{row.validation === 'RETAINED_UNCHANGED' ? 'Retained unchanged' : 'Canonical final evaluation'}
   {row.operationalRules === 'NOT_SUPPLIED' ? ' · Operational profile not supplied' : row.operationalRules === 'PROFILE_SUPPLIED' ? ' · Operational profile supplied' : ''}</span>
 </li>)}</ul> : <p>{empty}</p>;
}
function Reasons({ rows, empty }: { rows: ReadyView['reasons']; empty: string }) {
 return rows.length ? <ul>{rows.map((row, index) => <li key={index} data-reason-code={row.code}>
  <span>{row.message}</span>
  {row.locationId !== undefined ? <span>Location: {row.locationId}</span> : null}
  {row.start !== undefined ? <span>{row.start}{row.end !== undefined ? <> – {row.end}</> : null}</span> : null}
  {row.distinctEmployeeCount !== undefined ? <span>Affected people: {row.distinctEmployeeCount}</span> : null}
 </li>)}</ul> : <p>{empty}</p>;
}

/** Unused display precursor: accepts only the existing scoped projection.
 * The type-only import avoids the projector's node:crypto browser dependency.
 * Observation equality and sourceCurrent authenticate nobody. Protected reads,
 * receipt lookup, re-entry invalidation and canonical writers remain external.
 * The DTO has no display expiry: this component invents no TTL or timer policy. */
export function GenerationExplanationPanel({ result, connection, expected, sourceCurrent, onLookupOriginalOutcome }: GenerationExplanationPanelProps) {
 const view = result.state === 'view' ? result.view : null;
 const binding = result.state === 'view' ? result.binding : null;
 const current = connection === 'ready' && sourceCurrent && binding !== null &&
  bindingFields.every(field => binding[field] === expected[field]);
 const ready = current && view?.state === 'ready' && readyFields.every(field => view[field] === binding![field]) ? view : null;
 // Unknown receipts intentionally survive an authorized current source/config
 // advance. Their original IDs must still match the current selected operation
 // and generation; incarnation/actor/workspace/session are envelope observations.
 const unknown = current && view?.state === 'outcome-unknown' && view.generationId === binding!.generationId &&
  view.operationId === binding!.operationId ? view : null;
 let message = 'Generation explanation is unavailable. Return to the current generation review.';
 if (connection !== 'ready') message = ({ loading: 'Loading generation explanation', offline: 'Generation explanation is unavailable offline',
  reconnecting: 'Reconnecting to generation explanation', unavailable: 'Generation explanation is unavailable',
  access_lost: 'Generation explanation access ended', paused: 'Generation explanation updates paused' })[connection] + '. The result is unconfirmed.';
 else if (result.state === 'loading') message = 'Loading generation explanation. The result is unconfirmed.';
 else if (result.state === 'error') message = 'Generation explanation could not be loaded. Return to the current generation review.';
 else if (!current || view?.state === 'ready' && !ready || view?.state === 'outcome-unknown' && !unknown)
  message = 'The generation result is no longer current. Return to the current generation review.';
 else if (view?.state === 'conflict') message = 'The source changed. Return to the current generation review.';
 else if (unknown) message = 'The save outcome is unconfirmed. Check the original attempt.';
 const demandLabels = { POSITION: 'Positions', STAFFING: 'Staffing', LEAD: 'Designated lead' };
 const setupLabels = { READY: 'Ready', NEEDS_SETUP: 'Needs setup', INACTIVE: 'Inactive' };
 return <section className="schedule-publication-controls schedule-generation-controls" aria-label="Generation explanation"
  aria-busy={result.state === 'loading' || connection === 'loading'}>
  <h2>Generation explanation</h2>
  {ready ? <>
   <p role="status">{statusLabels[ready.status]} {nextLabels[ready.nextAction]}</p>
   <p className="schedule-generation-summary">Week of {ready.weekStart} · {ready.mode === 'BUILD_WEEK' ? 'Build week' : 'Fill gaps only'}</p>
   <p>Observed at <time dateTime={ready.observedAt}>{ready.observedAt}</time>.</p>
   <div className="shift-policy-scope">
    <h3>Plan coverage</h3>
    {ready.coverage.unavailable || ready.coverage.percentage === null ? <p>Coverage unavailable.</p> :
     <p>Configured coverage: {ready.coverage.percentage}% · Coverage minutes: {ready.coverage.coveredMinutes} / {ready.coverage.requiredMinutes}.</p>}
    <p>Draft proposal count: {ready.accepted.length} · Preserved assignment count: {ready.preserved.length}.</p>
    <p>Attempted locations: {ready.attemptedLocationIds.length}.</p>
    {ready.attemptedLocationIds.length ? <ul className="shift-change-history">{ready.attemptedLocationIds.map(id => <li key={id}>{id}</li>)}</ul> : null}
   </div>
   <div className="shift-policy-scope">
    <h3>Saving</h3>
    <p>{ready.save.state === 'NOT_SAVED' ? 'Not saved.' : ready.save.state === 'NO_CHANGE' ? 'No changes saved.' : 'Saved draft.'}</p>
    {ready.save.counts ? <ul className="shift-change-history">
     <li>Saved additions: {ready.save.counts.added}</li><li>Saved removals: {ready.save.counts.removed}</li>
     <li>Saved preserved assignments: {ready.save.counts.preserved}</li><li>Created draft schedules: {ready.save.counts.createdSchedules}</li>
    </ul> : <p>Saved counts are not available for this plan.</p>}
   </div>
   <div className="shift-policy-scope"><h3>Publication</h3><p>Generation does not publish a schedule.</p></div>
   <Disclosure title="Configured demand">
    {ready.configuredDemand.length ? <ul>{ready.configuredDemand.map((row, index) => <li key={index}>
     <strong>{row.locationId} · {demandLabels[row.kind]}</strong><span>{row.start} – {row.end}</span>
     <span>Required: {row.quantity}{row.positionId !== undefined ? <> · Position: {row.positionId}</> : null}</span>
    </li>)}</ul> : <p>No configured demand in this result. Review location setup.</p>}
   </Disclosure>
   <Disclosure title="Proposed assignments"><Assignments rows={ready.accepted} empty="No proposed assignments in this result."/></Disclosure>
   <Disclosure title="Preserved assignments">
    <Assignments rows={ready.preserved} empty="No preserved assignments in this result."/>
    {ready.replacedAssignmentIds.length ? <><p>Existing generated assignments selected for replacement in this plan:</p>
     <ul>{ready.replacedAssignmentIds.map(id => <li key={id}>{id}</li>)}</ul></> : null}
   </Disclosure>
   <Disclosure title="Location setup">
    <p>Locations excluded from this plan.</p>
    {ready.setup.length ? <ul>{ready.setup.map(row => <li key={row.locationId}>
     <strong>{row.locationId} · {setupLabels[row.state]}</strong>
     {row.issues.map(issue => <span key={issue.code}>{issue.message}</span>)}
    </li>)}</ul> : <p>No excluded setup issues in this result.</p>}
   </Disclosure>
   <Disclosure title="Remaining gaps">
    {ready.gaps.length ? <ul>{ready.gaps.map((row, index) => <li key={index}>
     <strong>{row.locationId} · {row.date} {row.startTime} – {row.endTime}</strong>
     <span>Staff missing: {row.missingStaff ?? 'Not configured'}</span>
     <span>Designated lead missing: {row.missingLead === null ? 'Not configured' : row.missingLead ? 'Yes' : 'No'}</span>
     {row.positions.map(position => <span key={position.positionId}>Position {position.positionId}: {position.missing} missing</span>)}
    </li>)}</ul> : <p>No uncovered configured periods in this result.</p>}
   </Disclosure>
   <Disclosure title="Reasons"><Reasons rows={ready.reasons} empty="No rejection reasons in this result."/></Disclosure>
   <Disclosure title="Advisory warnings"><Reasons rows={ready.warnings} empty="No advisory warnings in this result."/></Disclosure>
   <Disclosure title="Search budget">
    <p>{ready.budget.exhausted ? 'Budget exhausted.' : 'Budget not exhausted.'}</p>
    <dl><div><dt>Node limit</dt><dd>{ready.budget.limits.maxNodes}</dd></div>
     <div><dt>Evaluation limit</dt><dd>{ready.budget.limits.maxEvaluations}</dd></div>
     <div><dt>Period limit</dt><dd>{ready.budget.limits.maxPeriods}</dd></div></dl>
   </Disclosure>
  </> : <>
   <p role="status">{message}</p>
   {unknown ? <button type="button" className="button secondary compact-button" disabled={!onLookupOriginalOutcome}
    onClick={onLookupOriginalOutcome ? () => onLookupOriginalOutcome({ generationId: unknown.generationId, operationId: unknown.operationId }) : undefined}>
    Look up original outcome
   </button> : null}
  </>}
 </section>;
}
