'use client';

import { useState } from 'react';
import { PendingLabel } from '../employee-submit-button';
import type { PayrollRunsResponse } from '@/lib/payroll/contracts';
import type { usePayrollOperation } from './use-payroll';
import { PayrollPanel } from './payroll-ui';
import { backlogDescription } from './workflow-status';
import { formatDateRange, formatDisplayDate } from '@/lib/date-utils';

export function BacklogReview({ data, operation }: { data: PayrollRunsResponse; operation: ReturnType<typeof usePayrollOperation> }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const missing = data.missingPeriods ?? [];
  const backlog = data.backlog;
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  if (!backlog || (!backlog.overflow && backlog.missingCount === 0 && missing.length === 0)) return null;
  const key = (item: typeof missing[number]) => JSON.stringify(item);
  const visible = expanded ? missing : missing.slice(0, 3);
  const origin = (item: typeof missing[number]) => `backlog:${item.period.startDate}:${item.period.endDate}:${item.payday}:${item.settingsRevision}`;
  return <PayrollPanel title="Pay periods with no payroll run" description={backlogDescription(backlog)}>
    <p className="pw-small">Checked {backlog.rangeStart ? `${formatDisplayDate(backlog.rangeStart)} – ` : 'through '}{formatDisplayDate(backlog.asOfDate)}. A draft doesn’t finalize hours, approve amounts or send a payment.</p>
    {backlog.ambiguousCount !== null && backlog.ambiguousCount > 0 && <p className="pw-notice">{backlog.ambiguousCount} {backlog.ambiguousCount === 1 ? 'period needs' : 'periods need'} schedule-transition review.</p>}
    <div className="pw-backlog-list">{visible.map(item => <div className="pw-backlog-period" key={key(item)}>
      <div className="pw-backlog-heading"><div><strong>{formatDateRange(item.period.startDate, item.period.endDate)}</strong><small>Payday {formatDisplayDate(item.payday)} · Settings revision {item.settingsRevision}</small></div><button type="button" className="pw-button pw-secondary" aria-expanded={selected === key(item)} aria-controls={`period-${item.period.startDate}-${item.settingsRevision}`} disabled={locked} onClick={() => { setSelected(selected === key(item) ? null : key(item)); setAcknowledged(false); }}>{selected === key(item) ? 'Close review' : 'Review period'}</button></div>
      {selected === key(item) && <div id={`period-${item.period.startDate}-${item.settingsRevision}`} className="pw-backlog-confirm">
        {item.state === 'AMBIGUOUS_TRANSITION' && <div className="pw-notice"><strong>Review the schedule transition</strong>{item.issues.map((issue, index) => <p key={index}>{issue}</p>)}<p>Confirm these period boundaries and payday before manual preparation.</p></div>}
        <p className="pw-small">This draft uses the saved effective settings. Review its timecards, population and provider amounts before a separate approval.</p>
        {item.state === 'AMBIGUOUS_TRANSITION' && <label className="pw-check"><input type="checkbox" checked={acknowledged} disabled={locked} onChange={event => setAcknowledged(event.target.checked)} /><span>I reviewed this schedule transition, period boundaries and payday.</span></label>}
        <button type="button" className="pw-button" disabled={item.state === 'AMBIGUOUS_TRANSITION' && !acknowledged} aria-disabled={locked || undefined} onClick={() => { if (!locked && (item.state !== 'AMBIGUOUS_TRANSITION' || acknowledged)) void operation.submit({ action: 'PREPARE', period: item.period, payday: item.payday }, origin(item)); }}><PendingLabel pending={operation.busy && operation.activeAction === 'PREPARE' && operation.activeTarget === origin(item)} pendingText="Preparing…">Prepare this period</PendingLabel></button>
      </div>}
    </div>)}</div>
    {missing.length > 3 && <button type="button" className="pw-button pw-secondary" disabled={locked} onClick={() => setExpanded(value => !value)}>{expanded ? 'Show oldest three periods' : `Show all ${missing.length} returned periods`}</button>}
    {backlog.remainingCount !== null && backlog.remainingCount > 0 && <p className="pw-small">{backlog.remainingCount} additional missing periods follow this preview. Refresh after preparing a period to review the next oldest gaps.</p>}
  </PayrollPanel>;
}
