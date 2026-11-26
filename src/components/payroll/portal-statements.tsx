'use client';

import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import type { PayrollRun } from '@/lib/payroll/contracts';
import { CorpAvatar, CorpBody, CorpButton } from '../corp/corp';
import { BSegs, initialsOf } from '../owner-b/b-kit';
import { keepWhole } from '@/lib/keep-whole';
import { readPortalStatements, type PayrollPortalStatementsResponse } from './api';
import { usePayrollResource } from './use-payroll';
import { payDay, periodRange } from './payroll-format';
import { Num, PayGroup } from './pay-group';
import { usePayrollCopy, type PayrollCopy, type PayrollLang } from './payroll-copy';

type Statement = PayrollPortalStatementsResponse['statements'][number];

/** Owner premium A11, round 2 R9 (Codex priority 1): one two-line row per statement. Line 1 is the employee, named only
 * from records the page already holds (the run's rows, then the team list by the statement's employee ID), never from
 * the file name. Line 2 is the period, the payday and how it relates to another statement (a correction, or replaced
 * by one), plus "Not shared yet" only when the employee can't see it. The file name and revision are in the Download
 * label and its tooltip. View is the row's one teal action and Download a labelled neutral pill (Phase 8, a.md #21). */
function describe(statement: Statement, runs: PayrollRun[], names: Record<string, string>, t: PayrollCopy['myPay'], lang: PayrollLang) {
  const run = runs.find(item => item.documents.some(document => document.id === statement.id));
  const name = (statement.employeeId ? run?.rows?.find(row => row.employeeId === statement.employeeId)?.employeeName ?? names[statement.employeeId] : undefined) ?? null;
  const original = run?.correctionOf ? runs.find(item => item.id === run.correctionOf) : undefined;
  // A later linked correction that holds a statement for the same person replaces this one (authoritative run links).
  const replaced = statement.correctedBy || (!!run && !!statement.employeeId && runs.some(item => item.correctionOf === run.id
    && item.documents.some(document => document.kind === 'EMPLOYEE_STATEMENT' && document.employeeId === statement.employeeId)));
  const correction = !!run?.correctionOf || !!statement.corrects;
  // A correction of the same period just says "Correction"; one that corrects a different period names it.
  const otherPeriod = original && (original.period.startDate !== statement.period.startDate || original.period.endDate !== statement.period.endDate);
  const relation = correction ? (otherPeriod && original ? t.correctionOf(periodRange(original.period.startDate, original.period.endDate, lang)) : t.correction)
    : replaced ? t.replaced : null;
  return { run, name, correction, relation };
}

/** Pay statements the current payroll access covers, newest payday first and, within one person's period, the
 * correction before the statement it replaces (Pay history). */
export function PortalStatements({ runs, names = {} }: { runs: PayrollRun[]; names?: Record<string, string> }) {
  const { data, loading, error, reload } = usePayrollResource('/api/payroll/portal-statements', readPortalStatements);
  const { myPay: t, lang } = usePayrollCopy();
  const rows = (data?.statements ?? []).map((statement, index) => ({ statement, index, ...describe(statement, runs, names, t, lang) }))
    .sort((a, b) => b.statement.payday.localeCompare(a.statement.payday)
      || b.statement.period.startDate.localeCompare(a.statement.period.startDate)
      || (a.statement.employeeId === b.statement.employeeId ? Number(b.correction) - Number(a.correction) || (b.run?.revision ?? 0) - (a.run?.revision ?? 0) : 0)
      || a.index - b.index);
  return <PayGroup id="payroll-statements" label={t.payStatements}>
    {loading ? <CorpBody><p className="c-payroll__state" role="status">{t.loadingStatements}</p></CorpBody>
      : error ? <CorpBody><p className="c-payroll__state" role="alert">{error}</p><CorpButton kind="secondary" size="md" onClick={() => void reload()}>{t.tryAgain}</CorpButton></CorpBody>
      : rows.length ? <ul className="c-rows" aria-label={t.payStatements}>{rows.map(({ statement, run, name, relation }) => {
        const path = `/api/payroll/documents/${encodeURIComponent(statement.id)}`;
        const period = periodRange(statement.period.startDate, statement.period.endDate, lang);
        const who = name ?? t.employee;
        const file = run ? t.revision(statement.filename, run.revision) : statement.filename;
        return <li key={statement.id} className="c-pay__statement">
          <div className="c-row c-pay__stmt">
            {/* Phase 8 (a.md #21): a statement is a person's, so it leads with their face (one 36px lead slot). */}
            {name ? <CorpAvatar name={name} initials={initialsOf(name)} /> : null}
            <span className="c-row__main">
              <span className="c-row__title c-row__title--b">{name ?? t.employeeStatement}</span>
              {/* Premium pass (final regression review #3): the facts line is the kit's BSegs, so "Payday" stays with its date
                * and no line starts or ends on the middle dot. */}
              <span className="c-row__detail"><BSegs parts={[<Num key="period">{keepWhole(period)}</Num>, <span key="payday">{`${t.payday}\u00a0`}<Num>{keepWhole(payDay(statement.payday, lang))}</Num></span>, relation, statement.published ? null : t.notShared]} /></span>
            </span>
            <span className="c-pay__stmt-actions">
              {statement.viewUrl ? <a className="c-link c-link--l c-pay__stmt-view" href={`${path}/view`} aria-label={t.viewPersonStatement(who, period)}>{t.view}</a> : null}
              {/* Phase 8 (a.md #21): one labelled Download pill beside View, as DocumentRow draws it (review B5, NV-237). */}
              <a className="c-btn c-btn--secondary c-btn--sm c-pay__download" href={path} title={file} aria-label={t.downloadPersonStatement(who, period, file)}><DownloadSimpleIcon weight="bold" className="c-ic" aria-hidden="true" />{t.download}</a>
            </span>
          </div>
        </li>;
      })}</ul>
      : <div className="c-empty c-pay__empty"><b>{t.noStatements}</b><span>{t.noStatementsLine}</span></div>}
  </PayGroup>;
}
