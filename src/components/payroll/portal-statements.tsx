'use client';

import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import type { PayrollRun } from '@/lib/payroll/contracts';
import { CorpBody, CorpButton } from '../corp/corp';
import { readPortalStatements, type PayrollPortalStatementsResponse } from './api';
import { usePayrollResource } from './use-payroll';
import { payDay, periodRange } from './payroll-format';
import { Num, PayGroup } from './pay-group';

type Statement = PayrollPortalStatementsResponse['statements'][number];

/** Owner premium A11, round 2 R9 (Codex priority 1): one two-line row per statement. Line 1 is the employee, named only
 * from records the page already holds (the run's rows, then the team list by the statement's employee ID), never from
 * the file name. Line 2 is the period, the payday and how it relates to another statement (a correction, or replaced
 * by one), plus "Not shared yet" only when the employee can't see it. The file name and revision are in the Download
 * label and its tooltip. View is the row's one teal action and Download a neutral icon button. */
function describe(statement: Statement, runs: PayrollRun[], names: Record<string, string>) {
  const run = runs.find(item => item.documents.some(document => document.id === statement.id));
  const name = (statement.employeeId ? run?.rows?.find(row => row.employeeId === statement.employeeId)?.employeeName ?? names[statement.employeeId] : undefined) ?? null;
  const original = run?.correctionOf ? runs.find(item => item.id === run.correctionOf) : undefined;
  // A later linked correction that holds a statement for the same person replaces this one (authoritative run links).
  const replaced = statement.correctedBy || (!!run && !!statement.employeeId && runs.some(item => item.correctionOf === run.id
    && item.documents.some(document => document.kind === 'EMPLOYEE_STATEMENT' && document.employeeId === statement.employeeId)));
  const correction = !!run?.correctionOf || !!statement.corrects;
  // A correction of the same period just says "Correction"; one that corrects a different period names it.
  const otherPeriod = original && (original.period.startDate !== statement.period.startDate || original.period.endDate !== statement.period.endDate);
  const relation = correction ? `Correction${otherPeriod && original ? ` of ${periodRange(original.period.startDate, original.period.endDate)}` : ''}`
    : replaced ? 'Replaced by a correction' : null;
  return { run, name, correction, relation };
}

/** Pay statements the current payroll access covers, newest payday first and, within one person's period, the
 * correction before the statement it replaces (Pay history). */
export function PortalStatements({ runs, names = {} }: { runs: PayrollRun[]; names?: Record<string, string> }) {
  const { data, loading, error, reload } = usePayrollResource('/api/payroll/portal-statements', readPortalStatements);
  const rows = (data?.statements ?? []).map((statement, index) => ({ statement, index, ...describe(statement, runs, names) }))
    .sort((a, b) => b.statement.payday.localeCompare(a.statement.payday)
      || b.statement.period.startDate.localeCompare(a.statement.period.startDate)
      || (a.statement.employeeId === b.statement.employeeId ? Number(b.correction) - Number(a.correction) || (b.run?.revision ?? 0) - (a.run?.revision ?? 0) : 0)
      || a.index - b.index);
  return <PayGroup id="payroll-statements" label="Pay statements">
    {loading ? <CorpBody><p className="c-payroll__state" role="status">Loading pay statements…</p></CorpBody>
      : error ? <CorpBody><p className="c-payroll__state" role="alert">{error}</p><CorpButton kind="secondary" size="md" onClick={() => void reload()}>Try again</CorpButton></CorpBody>
      : rows.length ? <ul className="c-rows" aria-label="Pay statements">{rows.map(({ statement, run, name, relation }) => {
        const path = `/api/payroll/documents/${encodeURIComponent(statement.id)}`;
        const period = periodRange(statement.period.startDate, statement.period.endDate);
        const who = name ?? 'Employee';
        const file = `${statement.filename}${run ? `, revision ${run.revision}` : ''}`;
        const extra = [relation, statement.published ? null : 'Not shared yet'].filter(Boolean).join('\u00a0· ');
        return <li key={statement.id} className="c-pay__statement">
          <div className="c-row c-pay__stmt">
            <span className="c-row__main">
              <span className="c-row__title c-row__title--b">{name ?? 'Employee statement'}</span>
              <span className="c-row__detail"><span><Num>{period}</Num>{'\u00a0· Payday '}<Num>{payDay(statement.payday)}</Num>{extra ? `\u00a0· ${extra}` : ''}</span></span>
            </span>
            <span className="c-pay__stmt-actions">
              {statement.viewUrl ? <a className="c-link c-link--l c-pay__stmt-view" href={`${path}/view`} aria-label={`View ${who} pay statement, ${period}`}>View</a> : null}
              <a className="c-pay__icon-btn" href={path} title={file} aria-label={`Download ${who} pay statement, ${period} (${file})`}><DownloadSimpleIcon className="c-ic" aria-hidden="true" /></a>
            </span>
          </div>
        </li>;
      })}</ul>
      : <div className="c-empty c-pay__empty"><b>No pay statements yet</b><span>They appear once statements are made for payroll you can see.</span></div>}
  </PayGroup>;
}
