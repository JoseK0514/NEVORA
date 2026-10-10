'use client';

import type { ActivityProjection, ActivityEntry, ActivityCoverage } from '../lib/activity/types';

type Connection = 'ready' | 'loading' | 'offline' | 'reconnecting' | 'unavailable' | 'access_lost' | 'paused';
export type ActivityHistoryObservationBinding = {
 workspaceId: string; actorId: string; sessionVersion: string; grantsVersion: string; scopeVersion: string;
 incarnation: string; sourceVersion: string; queryVersion: string; mode: 'READ'; observedAt: string;
};
export type ActivityHistoryPanelResult =
 | { state: 'projection'; projection: ActivityProjection | null; binding: ActivityHistoryObservationBinding | null }
 | { state: 'loading' | 'error' };
export type ActivityHistoryPanelProps = {
 result: ActivityHistoryPanelResult;
 expected: ActivityHistoryObservationBinding;
 connection: Connection;
 /** Presentation observation only. Protected adapters must invalidate on
  * re-entry, source changes, access loss and namespace/session replacement. */
 sourceCurrent: boolean;
};
const bindingFields = ['workspaceId', 'actorId', 'sessionVersion', 'grantsVersion', 'scopeVersion', 'incarnation',
 'sourceVersion', 'queryVersion', 'mode', 'observedAt'] as const;
const actorLabels = { EMPLOYEE: 'Employee', SERVICE: 'Service', UNKNOWN: 'Unknown' };
const provenanceLabels = { PROSPECTIVE: 'Prospective', PRESERVED: 'Preserved' };
const historyLabels = { PRESERVED_HISTORY: 'Preserved historical observations', NOT_OBSERVED: 'Historical activity not observed', UNKNOWN: 'Historical coverage unknown' };
const gapLabels = { PRE_F_NOT_INSTRUMENTED: 'Pre-F activity was not instrumented', SOURCE_NOT_OBSERVED: 'Source not observed', ADAPTER_LIMIT: 'Adapter observation limit' };

function SourceReference({ reference, label }: { reference: NonNullable<ActivityEntry['source']>; label: 'Source' | 'Ledger' }) {
 return <>
  <div><dt>{label} table</dt><dd>{reference.table}</dd></div>
  <div><dt>{label} identity</dt><dd>{reference.id}</dd></div>
  <div><dt>{label} version</dt><dd>{reference.version}</dd></div>
  {reference.digest !== undefined ? <div><dt>{label} hash</dt><dd>{reference.digest ?? 'Not observed'}</dd></div> : null}
 </>;
}
function Entry({ entry }: { entry: ActivityEntry }) {
 return <li data-activity-id={entry.id}>
  <details className="schedule-publication-change shift-policy-disclosure">
   <summary>{entry.eventType} · {provenanceLabels[entry.provenanceKind]} · <time dateTime={entry.occurredAt}>{entry.occurredAt}</time></summary>
   <dl>
    <div><dt>Event identity</dt><dd>{entry.id}</dd></div>
    <div><dt>Purpose</dt><dd>{entry.purpose}</dd></div>
    <div><dt>Recording provenance</dt><dd>{provenanceLabels[entry.provenanceKind]}</dd></div>
    {entry.actor ? <>
     <div><dt>Actor kind</dt><dd>{actorLabels[entry.actor.kind]}</dd></div>
     <div><dt>Actor identity</dt><dd>{entry.actor.id ?? 'Actor identity not observed'}</dd></div>
     <div><dt>Proof kind</dt><dd>{entry.actor.proofKind ?? 'Proof kind not observed'}</dd></div>
    </> : null}
    {entry.source ? <SourceReference reference={entry.source} label="Source"/> : null}
    {entry.provenance?.kind === 'PROSPECTIVE' ? <>
     <div><dt>Operation purpose</dt><dd>{entry.provenance.operation.purpose}</dd></div>
     <div><dt>Operation identity</dt><dd>{entry.provenance.operation.id}</dd></div>
    </> : entry.provenance?.kind === 'PRESERVED' ? <>
     <SourceReference reference={entry.provenance.ledger} label="Ledger"/>
     <div><dt>Original event type</dt><dd>{entry.provenance.sourceEventType ?? 'Not observed'}</dd></div>
    </> : null}
   </dl>
   <h3>Changed field codes</h3>
   {entry.summary.changedFields.length ? <ul>{entry.summary.changedFields.map(field => <li key={field}>{field}</li>)}</ul> :
    <p>No changed field codes were included in this observation.</p>}
  </details>
 </li>;
}
function Coverage({ coverage }: { coverage: ActivityCoverage }) {
 const h = coverage.historical;
 return <li>
  <h3>{coverage.family}</h3><p>{historyLabels[h.state]}.</p>
  <dl><div><dt>Observed history starts</dt><dd>{h.observedFrom !== null ? <time dateTime={h.observedFrom}>{h.observedFrom}</time> : 'Not observed'}</dd></div>
   <div><dt>Observed history through</dt><dd>{h.observedThrough !== null ? <time dateTime={h.observedThrough}>{h.observedThrough}</time> : 'Not observed'}</dd></div></dl>
  {h.ledgers.length ? <><h4>Preserved ledger references</h4><ul>{h.ledgers.map(ledger => <li key={ledger}>{ledger}</li>)}</ul></> :
   <p>No preserved ledger references were included in this observation.</p>}
  <h4>Historical observation gaps</h4>
  <ul>{h.gaps.map((gap, index) => <li key={index}>
   <span>{gapLabels[gap.reason]}.</span>
   <span>{gap.from !== null ? <time dateTime={gap.from}>{gap.from}</time> : 'Start not observed'} – {gap.until !== null ? <time dateTime={gap.until}>{gap.until}</time> : 'End not observed'}</span>
  </li>)}</ul>
 </li>;
}

/** Unused sanitized READ DTO presentation. Type-only imports ensure no
 * projector or capability evaluator enters this component. Binding equality
 * and sourceCurrent authenticate nobody; protected source/query/field access
 * remains an adapter prerequisite. There are no readers, writes, callbacks,
 * download/export, payload serializers, sorters, TTLs or history constructors. */
export function ActivityHistoryPanel({ result, expected, connection, sourceCurrent }: ActivityHistoryPanelProps) {
 const projection = result.state === 'projection' ? result.projection : null;
 const binding = result.state === 'projection' ? result.binding : null;
 const current = connection === 'ready' && sourceCurrent && binding !== null && binding.mode === 'READ' && expected.mode === 'READ' &&
  bindingFields.every(field => binding[field] === expected[field]);
 const ready = current && projection?.state === 'ready' && projection.mode === 'READ' && projection.observedAt === binding!.observedAt ? projection : null;
 let message = 'Activity history is unavailable. Return to the current history view.';
 if (connection !== 'ready') message = ({ loading: 'Loading activity history', offline: 'Activity history is unavailable offline',
  reconnecting: 'Reconnecting to activity history', unavailable: 'Activity history is unavailable', access_lost: 'Activity history access ended',
  paused: 'Activity history updates paused' })[connection] + '. The view is unconfirmed.';
 else if (result.state === 'loading') message = 'Loading activity history. The view is unconfirmed.';
 else if (result.state === 'error') message = 'Activity history could not be loaded. Return to the current history view.';
 else if (!current || projection?.state === 'ready' && projection.mode === 'READ' && !ready)
  message = 'The activity history view is no longer current. Return to the current history view.';
 return <section className="schedule-publication-controls" aria-label="Activity history" aria-busy={result.state === 'loading' || connection === 'loading'}>
  <h2>Activity history</h2>
  {ready ? <div className="shift-change-history">
   <p role="status">Observed activity count: {ready.count}.</p>
   <p>Only observed activity is shown. Historical recording may be incomplete.</p>
   <p>Observed at <time dateTime={ready.observedAt}>{ready.observedAt}</time>.</p>
   {ready.entries.length ? <ol aria-label="Observed activity entries">{ready.entries.map(entry => <Entry key={entry.id} entry={entry}/>)}</ol> :
    <p>No activity entries were observed for this view.</p>}
   <details className="schedule-publication-change shift-policy-disclosure">
    <summary>Historical coverage</summary>
    {ready.coverage.length ? <ul>{ready.coverage.map((coverage, index) => <Coverage key={index} coverage={coverage}/>)}</ul> :
     <p>Historical coverage was not supplied for this view.</p>}
   </details>
  </div> : <p role="status">{message}</p>}
 </section>;
}
