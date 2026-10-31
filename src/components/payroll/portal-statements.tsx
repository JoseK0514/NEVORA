'use client';

import type { PayrollRun } from '@/lib/payroll/contracts';
import { CorpBody, CorpButton, CorpCard } from '../corp/corp';
import { readPortalStatements } from './api';
import { usePayrollResource } from './use-payroll';
import { DocumentRow } from './document-row';

const range = (start: string, end: string) => {
  const format = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  return `${format(start)} – ${format(end)}`;
};

/** Private employee statements the current payroll access covers, newest history first (Pay history). */
export function PortalStatements({ runs }: { runs: PayrollRun[] }) {
  const { data, loading, error, reload } = usePayrollResource('/api/payroll/portal-statements', readPortalStatements);
  return <CorpCard id="payroll-statements" label="Private employee statements">
    {loading ? <CorpBody><p className="c-payroll__state" role="status">Loading private statement history…</p></CorpBody>
      : error ? <CorpBody><p className="c-payroll__state" role="alert">{error}</p><CorpButton kind="secondary" size="md" onClick={() => void reload()}>Try again</CorpButton></CorpBody>
      : data?.statements.length ? <ul className="c-rows" aria-label="Private employee statements">{data.statements.map(statement => {
        const run = runs.find(item => item.documents.some(document => document.id === statement.id));
        const name = run?.rows?.find(row => row.employeeId === statement.employeeId)?.employeeName;
        const original = run?.correctionOf ? runs.find(item => item.id === run.correctionOf) : undefined;
        return <li key={statement.id} className="c-pay__statement">
          <div className="c-pay__statement-head">
            <b className="c-pay__strong">{name ?? 'Employee statement'}</b>
            <span className="c-pay__detail">{`${range(statement.period.startDate, statement.period.endDate)} · Payday ${range(statement.payday, statement.payday).split(' – ')[0]}${run ? ` · Revision ${run.revision}` : ''}`}</span>
            {run?.correctionOf ? <span className="c-pay__detail">{`Linked correction${original ? ` of ${range(original.period.startDate, original.period.endDate)}` : ''}${run.nativeCorrection ? ` · ${run.nativeCorrection.reason}` : ''}`}</span> : null}
          </div>
          <DocumentRow document={statement} />
        </li>;
      })}</ul>
      : <CorpBody><p className="c-payroll__state">No employee statements yet. They appear after generation, while your access covers their payroll.</p></CorpBody>}
  </CorpCard>;
}
