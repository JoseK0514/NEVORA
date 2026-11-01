'use client';

import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import type { PayrollRun } from '@/lib/payroll/contracts';
import { CorpBody, CorpButton, CorpCard } from '../corp/corp';
import { readPortalStatements, type PayrollPortalStatementsResponse } from './api';
import { usePayrollResource } from './use-payroll';

const day = (date: string) => new Date(`${date}T12:00:00Z`);
const range = (start: string, end: string) => {
  const format = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(day(date));
  return `${format(start)} – ${format(end)}`;
};
const payday = (date: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(day(date));

type Statement = PayrollPortalStatementsResponse['statements'][number];

/** Owner premium A11 (Codex priority 1): one row per statement. The employee comes first, named only from records the
 * page already holds (the run's rows, then the team list by the statement's employee ID), never from the file name.
 * Then the period and payday, then whether it corrects or was replaced by another statement, and its publication. The
 * file name stays as a quiet line; View is the row's one teal action and Download a neutral icon button. */
function describe(statement: Statement, runs: PayrollRun[], names: Record<string, string>) {
  const run = runs.find(item => item.documents.some(document => document.id === statement.id));
  const name = (statement.employeeId ? run?.rows?.find(row => row.employeeId === statement.employeeId)?.employeeName ?? names[statement.employeeId] : undefined) ?? null;
  const original = run?.correctionOf ? runs.find(item => item.id === run.correctionOf) : undefined;
  // A later linked correction that holds a statement for the same person replaces this one (authoritative run links).
  const replaced = statement.correctedBy || (!!run && !!statement.employeeId && runs.some(item => item.correctionOf === run.id
    && item.documents.some(document => document.kind === 'EMPLOYEE_STATEMENT' && document.employeeId === statement.employeeId)));
  const correction = !!run?.correctionOf || !!statement.corrects;
  const relation = correction ? `Correction${original ? ` of ${range(original.period.startDate, original.period.endDate)}` : ''}${run?.nativeCorrection ? ` · ${run.nativeCorrection.reason}` : ''}`
    : replaced ? 'Replaced by a correction' : null;
  return { run, name, correction, relation };
}

/** Private employee statements the current payroll access covers, newest payday first and, within one person's period,
 * the correction before the statement it replaces (Pay history). */
export function PortalStatements({ runs, names = {} }: { runs: PayrollRun[]; names?: Record<string, string> }) {
  const { data, loading, error, reload } = usePayrollResource('/api/payroll/portal-statements', readPortalStatements);
  const rows = (data?.statements ?? []).map((statement, index) => ({ statement, index, ...describe(statement, runs, names) }))
    .sort((a, b) => b.statement.payday.localeCompare(a.statement.payday)
      || b.statement.period.startDate.localeCompare(a.statement.period.startDate)
      || (a.statement.employeeId === b.statement.employeeId ? Number(b.correction) - Number(a.correction) || (b.run?.revision ?? 0) - (a.run?.revision ?? 0) : 0)
      || a.index - b.index);
  return <CorpCard id="payroll-statements" label="Private employee statements">
    {loading ? <CorpBody><p className="c-payroll__state" role="status">Loading private statement history…</p></CorpBody>
      : error ? <CorpBody><p className="c-payroll__state" role="alert">{error}</p><CorpButton kind="secondary" size="md" onClick={() => void reload()}>Try again</CorpButton></CorpBody>
      : rows.length ? <ul className="c-rows" aria-label="Private employee statements">{rows.map(({ statement, run, name, relation }) => {
        const path = `/api/payroll/documents/${encodeURIComponent(statement.id)}`;
        const period = range(statement.period.startDate, statement.period.endDate);
        const who = name ?? 'Employee';
        const status = statement.published ? 'Published to employee' : 'Private · not published';
        return <li key={statement.id} className="c-pay__statement">
          <div className="c-row c-pay__stmt">
            <span className="c-row__main">
              <span className="c-row__title c-row__title--b">{name ?? 'Employee statement'}</span>
              <span className="c-row__detail"><span>{`${period} · Payday ${payday(statement.payday)}`}</span></span>
              <span className="c-row__detail"><span>{[relation, status].filter(Boolean).join(' · ')}</span></span>
              <span className="c-pay__fname">{`${statement.filename}${run ? ` · Revision ${run.revision}` : ''}`}</span>
            </span>
            <span className="c-pay__stmt-actions">
              {statement.viewUrl ? <a className="c-link c-link--l c-pay__stmt-view" href={`${path}/view`} aria-label={`View ${who} statement, ${period}`}>View</a> : null}
              <a className="c-pay__icon-btn" href={path} aria-label={`Download ${who} statement, ${period} (${statement.filename})`}><DownloadSimpleIcon className="c-ic" aria-hidden="true" /></a>
            </span>
          </div>
        </li>;
      })}</ul>
      : <div className="c-empty c-pay__empty"><b>No employee statements yet</b><span>They appear after generation, while your access covers their payroll.</span></div>}
  </CorpCard>;
}
