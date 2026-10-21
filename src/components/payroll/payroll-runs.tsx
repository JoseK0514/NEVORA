'use client';

import { PayrollStepper } from './payroll-stepper';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRightIcon, CalendarDotsIcon, CheckCircleIcon, FileArrowUpIcon, WarningCircleIcon } from '@phosphor-icons/react/ssr';
import type { PayrollCapabilities, PayrollRun } from '@/lib/payroll/contracts';
import { parsePayrollImport, readRuns } from './api';
import { formatPayrollMoney } from './money';
import { usePayrollOperation, usePayrollResource } from './use-payroll';
import { DocumentLink, OperationFeedback, PayrollFrame, PayrollPanel, PayrollState, PrivacyNote } from './payroll-ui';
import { BacklogReview } from './backlog-review';
import { NativeReview } from './native-review';
import { PortalStatements } from './portal-statements';
import { noticeOutcome, noticeReadiness, payrollExceptionMessage, payrollReviewNotes } from './workflow-status';
import { formatDateRange, formatDisplayDate } from '@/lib/date-utils';
import { keepWhole as keepWholeBase } from '@/lib/keep-whole';
/** WR-B-11: also keeps a weekday with its date ("Mon, Oct 19"); the shared keepWhole doesn't yet. */
const keepWhole = (text: string) => keepWholeBase(text).replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun), /g, '$1,\u00a0');

const statusLabels = { BLOCKED: 'Needs attention', WAITING_FOR_AMOUNTS: 'Waiting for amounts', REVIEW_REQUIRED: 'Review required', APPROVED: 'Approved' };
const jobLabels = { PREPARE: 'Draft preparation', PDF: 'PDF generation', PUBLISH: 'Statement publication', REMINDER: 'Private payroll notice' };

export function PayrollRuns({ recoveryScope }: { recoveryScope: string }) {
  const resource = usePayrollResource('/api/payroll/runs', readRuns);
  const operation = usePayrollOperation('/api/payroll/runs', resource.reload, recoveryScope);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prepareOpen, setPrepareOpen] = useState(false);
  useEffect(() => {
    const runId = operation.receipt?.runId;
    if (!runId) return;
    let active = true;
    queueMicrotask(() => { if (active) setSelectedId(runId); });
    return () => { active = false; };
  }, [operation.receipt]);
  const data = !resource.loading && resource.data?.capabilities.canReview ? resource.data : null;
  const run = data?.runs.find(item => item.id === selectedId) ?? data?.runs[0];
  const locked = resource.loading || operation.busy || (!!operation.pending && !operation.resuming);
  return <PayrollFrame title="Payroll" description="Review payroll, approve an exact revision and track private pay statements.">
    <div className="wb-payroll-feedback"><OperationFeedback operation={operation} /></div>
    {resource.loading ? <PayrollState title="Loading payroll">Checking your current access and payroll runs.</PayrollState> : resource.error ? <PayrollState title="Payroll unavailable" error retry={() => void resource.reload()}>{resource.error}</PayrollState> : !data && resource.data ? <PayrollState title="Payroll access unavailable">Your current account cannot review these payroll runs.</PayrollState> : data && <>
      <div className="pw-toolbar"><p><CalendarDotsIcon size={18} aria-hidden />{data.runs.length} payroll {data.runs.length === 1 ? 'run' : 'runs'}</p><div className="pw-actions"><button className="pw-button pw-secondary" onClick={() => void resource.reload()} disabled={resource.loading || locked}>Refresh</button><button className="pw-button" onClick={() => setPrepareOpen(value => !value)} disabled={locked}>Prepare a draft<ArrowRightIcon size={18} aria-hidden /></button></div></div>
      {prepareOpen && <PayrollPanel title="New payroll draft" description="Draft preparation checks finalized time. It does not finalize timecards or approve payroll."><form className="pw-form" onSubmit={event => {
        event.preventDefault(); const values = new FormData(event.currentTarget);
        void operation.submit({ action: 'PREPARE', period: { startDate: String(values.get('start')), endDate: String(values.get('end')) }, payday: String(values.get('payday')) });
      }}><fieldset disabled={locked}><div className="pw-fields"><label>Period start<input name="start" type="date" required /></label><label>Period end<input name="end" type="date" required /></label><label>Payday<input name="payday" type="date" required /></label></div><button className="pw-button" type="submit">Prepare draft</button></fieldset></form></PayrollPanel>}
      <BacklogReview data={data} operation={operation} />
      {data.runs.length === 0 ? <PayrollState title="No payroll runs yet">Start with company payroll settings, then prepare a draft for the period you want to review.</PayrollState> : <div className="pw-review-layout">
        <PayrollPanel title="Pay periods" description="Each approval belongs to one exact revision."><div className="pw-run-list">{data.runs.map(item => <button key={item.id} type="button" className={`pw-run-option${item.id === run?.id ? ' selected' : ''}`} aria-pressed={item.id === run?.id} onClick={() => setSelectedId(item.id)} disabled={locked}>
          <span><strong>{keepWhole(formatDateRange(item.period.startDate, item.period.endDate))}</strong>{item.correctionOf && <small>Correction · original history retained</small>}<small>Payday {keepWhole(formatDisplayDate(item.payday))} · Revision {item.revision}</small></span><span className={`pw-badge ${item.status === 'APPROVED' ? 'pw-badge-success' : ''}`} data-status={item.status}>{statusLabels[item.status]}</span>
        </button>)}</div></PayrollPanel>
        {run && <div className="pw-review-current"><p className="pw-workflow-guidance" role="status"><strong>Next step:</strong> {run.status === 'BLOCKED' ? 'Resolve the listed prerequisites, then recalculate this draft.' : run.status === 'WAITING_FOR_AMOUNTS' ? 'Import the historical provider amounts for this draft.' : run.status === 'REVIEW_REQUIRED' ? 'Review employee amounts and the saved source before approving.' : run.sourceAuthority === 'NATIVE_RECORDED_TIME' ? 'Track document generation and automatic publication to My pay.' : 'Review approved documents and publish statements when ready.'}</p>
        <RunReview key={`${run.id}:${run.revision}:${run.reviewToken}`} run={run} capabilities={data.capabilities} operation={operation} /></div>}
      </div>}
      {data.jobs.length > 0 && <PayrollPanel title="Preparation and delivery" description="Document generation, publication and notice queues have separate results.">
        <div className="pw-job-list">{data.jobs.map(job => <div className="pw-job" key={job.id}>
          <div><strong>{jobLabels[job.kind]}</strong><small>{job.status.toLowerCase().replaceAll('_', ' ')} · {job.attempts} {job.attempts === 1 ? 'attempt' : 'attempts'}</small>
            {job.kind === 'REMINDER' && <p className="pw-small">{noticeOutcome(job.outcome)}</p>}
            {job.error && <p className="pw-error"><WarningCircleIcon size={18} aria-hidden="true" /><span>{job.error}</span></p>}
          </div>
          {job.status === 'FAILED' && data?.capabilities.canApprove && <button className="pw-button pw-secondary" type="button" disabled={locked} onClick={() => void operation.submit({ action: 'RETRY_JOB', jobId: job.id })}>Retry {job.kind === 'REMINDER' ? 'notice queue' : jobLabels[job.kind].toLowerCase()}</button>}
        </div>)}</div>
      </PayrollPanel>}
      <PortalStatements runs={data.runs} />
      <PrivacyNote>Financial records are restricted to current payroll access. NEVORA records payroll and pay statements; it does not process payments. {noticeReadiness(data.capabilities)}</PrivacyNote>
    </>}
  </PayrollFrame>;
}

function RunReview({ run, capabilities, operation }: { run: PayrollRun; capabilities: PayrollCapabilities; operation: ReturnType<typeof usePayrollOperation> }) {
  const [reviewed, setReviewed] = useState(false);
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const native = run.sourceAuthority === 'NATIVE_RECORDED_TIME';
  const notes = payrollReviewNotes(run.exceptions);
  const rows = run.rows?.filter(row => row.employeeName.toLowerCase().includes(filter.toLowerCase())) ?? [];
  const importAmounts = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setImportError('');
    try {
      const amounts = parsePayrollImport(importText);
      if (amounts.period.startDate !== run.period.startDate || amounts.period.endDate !== run.period.endDate || amounts.payday !== run.payday) throw new Error('The import period and payday must match this draft.');
      if (correctionOpen) {
        const reason = String(new FormData(event.currentTarget).get('correctionReason') ?? '').trim();
        if (!reason) throw new Error('Explain the correction before creating its linked revision.');
        void operation.submit({ action: 'CORRECT', runId: run.id, expectedRevision: run.revision, reason, amounts });
      } else void operation.submit({ action: 'IMPORT', runId: run.id, expectedRevision: run.revision, amounts });
    } catch (failure) { setImportError(failure instanceof Error ? failure.message : 'Check the payroll import.'); }
  };
  return <PayrollPanel title={keepWhole(formatDateRange(run.period.startDate, run.period.endDate))} description={keepWhole(`Payday ${formatDisplayDate(run.payday)} · Revision ${run.revision}`)} aside={<span className={`pw-badge ${run.status === 'APPROVED' ? 'pw-badge-success' : ''}`} data-status={run.status}>{statusLabels[run.status]}</span>}>
    <PayrollStepper run={run} />
    {run.correctionOf && <p className="pw-notice">Correction linked to payroll run <code>{run.correctionOf}</code>. The original approval and statements remain in history.{run.nativeCorrection && <><br /><strong>Correction reason:</strong> {run.nativeCorrection.reason}</>}</p>}
    {notes.corrections.map((reason, index) => <p className="pw-notice" key={index}><strong>Correction reason:</strong> {reason}</p>)}
    {notes.blocking.length > 0 && <PayrollState title={run.status === 'WAITING_FOR_AMOUNTS' ? 'Provider amounts needed' : 'Resolve these exceptions'} error={run.status !== 'WAITING_FOR_AMOUNTS'}>{notes.blocking.map((exception, index) => <span className="pw-exception" key={index}>{payrollExceptionMessage(exception)}</span>)}</PayrollState>}
    {run.totals && <dl className="pw-totals">
      <div><dt>Gross pay</dt><dd>{formatPayrollMoney(run.totals.grossMinor)}</dd></div>
      <div><dt>Employee deductions</dt><dd>{formatPayrollMoney(run.totals.deductionsMinor)}</dd></div>
      <div><dt>Employer contributions</dt><dd>{formatPayrollMoney(run.totals.employerContributionsMinor)}</dd></div>
      <div className="pw-net"><dt>Net pay · {run.totals.employeeCount} employees</dt><dd>{formatPayrollMoney(run.totals.netMinor)}</dd></div>
    </dl>}
    {native ? <div className="pw-source"><strong>{run.status === 'BLOCKED' ? 'Recorded-time payroll' : 'Finalized recorded time'}</strong><p>{run.status === 'BLOCKED' ? 'Complete the listed time and employee prerequisites before recalculating this draft.' : 'Calculation uses recorded punches, recorded breaks and employee payroll facts for this revision.'}</p><small>Settings revision {run.settingsRevision ?? 'not configured'} · Employee population revision {run.populationRevision ?? 'not ready'}</small></div> : <div className="pw-source"><strong>Amounts from your payroll provider or accountant</strong><p>{run.sourceName ? `${run.sourceName} · ${run.sourceReference}` : 'Import trusted provider or accountant amounts before reviewing payroll.'}</p><details><summary>Source details</summary><small>Settings version {run.settingsRevision ?? 'not configured'} · Import version {run.importRevision} · Employee version {run.populationRevision ?? 'not ready'}</small></details></div>}
    {native && run.status !== 'APPROVED' && <section className="pw-section"><h3>Refresh the calculation</h3><p className="pw-small">After the missing facts or recorded time are corrected, recalculate to create a fresh revision for review. This does not approve or finalize timecards.</p><button className="pw-button pw-secondary" type="button" disabled={locked || !capabilities.canReview} onClick={() => void operation.submit({ action: 'RECALCULATE', runId: run.id, expectedRevision: run.revision })}>Recalculate draft</button></section>}
    {run.rows && <section className="pw-section"><div className="pw-subheading"><h3>Employee amounts</h3><label className="pw-search"><span className="sr-only">Find employee amounts</span><input type="search" placeholder="Find an employee" value={filter} onChange={event => setFilter(event.target.value)} /></label></div><div className="pw-amount-list">{rows.map(row => <details key={row.employeeId} className="pw-employee-amount"><summary><span><strong>{row.employeeName}</strong><small>Net pay</small></span><strong className="pw-money">{formatPayrollMoney(row.netMinor)}</strong></summary><dl className="pw-lines"><div><dt>Gross pay</dt><dd>{formatPayrollMoney(row.grossMinor)}</dd></div>{row.earnings?.map((line, index) => <div key={`earnings${index}`}><dt>{line.label}</dt><dd>{formatPayrollMoney(line.amountMinor)}</dd></div>)}<div className="pw-line-label"><dt>Employee deductions</dt><dd /></div>{row.employeeDeductions.length ? row.employeeDeductions.map((line, index) => <div key={`deduction${index}`}><dt>{line.label}</dt><dd>{formatPayrollMoney(line.amountMinor)}</dd></div>) : <div><dt>{native ? 'No employee deductions' : 'No imported employee deductions'}</dt><dd /></div>}<div className="pw-line-label"><dt>Employer contributions</dt><dd /></div>{row.employerContributions.length ? row.employerContributions.map((line, index) => <div key={`employer${index}`}><dt>{line.label}</dt><dd>{formatPayrollMoney(line.amountMinor)}</dd></div>) : <div><dt>{native ? 'No employer contributions' : 'No imported employer contributions'}</dt><dd /></div>}</dl>{native && run.nativeCalculation?.employees.find(result => result.employeeId === row.employeeId) && <NativeReview result={run.nativeCalculation.employees.find(result => result.employeeId === row.employeeId)!} />}<p className="pw-small">Employee exception revision {run.exceptionRevisions.find(item => item.employeeId === row.employeeId)?.revision ?? 'none'} · Employee reference <code>{row.employeeId}</code></p></details>)}</div>{rows.length === 0 && <p className="pw-small">No employees match your search.</p>}</section>}
    {!native && (run.status !== 'APPROVED' || correctionOpen) && <section className="pw-section"><h3><FileArrowUpIcon size={20} aria-hidden />{correctionOpen ? 'Create a linked correction' : 'Import provider amounts'}</h3><p className="pw-small">Use the neutral JSON import supplied by your payroll provider or accountant. {capabilities.internalCalculatorAvailable ? 'Historical provider runs retain their imported amounts. Native payroll does not replace the source of this historical review.' : 'NEVORA preserves imported amounts; a statutory calculator is unavailable.'}</p><form className="pw-form" onSubmit={importAmounts}><fieldset disabled={locked}><label>Payroll import file<input type="file" accept="application/json,.json" onChange={async event => {
      const file = event.target.files?.[0]; if (!file) return;
      setImportError('');
      try { if (file.size > 524288) throw new Error('Choose an import smaller than 512 KB.'); setImportText(await file.text()); } catch (failure) { setImportError(failure instanceof Error ? failure.message : 'The import file could not be read.'); }
    }} /></label><details className="pw-import-format"><summary>Import format and contents</summary><p className="pw-small">Required: schema NEVORA_PAYROLL_IMPORT_V1, currency USD, sourceName, sourceReference, period, payday and rows. Each row includes employeeId, grossMinor, employeeDeductions, employerContributions and netMinor. Each amount is a whole-cent string; each line includes code, label and amountMinor.</p><label>Import JSON<textarea rows={8} value={importText} onChange={event => setImportText(event.target.value)} spellCheck={false} /></label></details>{importText && <p className="pw-small">Import loaded in this page. Review employee amounts after the server validates it.</p>}{correctionOpen && <label>Correction reason<textarea name="correctionReason" required maxLength={300} rows={3} /></label>}{importError && <p className="pw-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>{importError}</span></p>}<button className="pw-button" type="submit" disabled={!importText}>{correctionOpen ? 'Create correction draft' : 'Validate and import amounts'}<ArrowRightIcon size={18} aria-hidden /></button></fieldset></form></section>}
    {run.status === 'REVIEW_REQUIRED' && <section className="pw-section">
      <h3>Approve this revision</h3>
      <p className="pw-small">Approval freezes the reviewed amounts, finalized time, settings and employee exceptions. A changed source requires a fresh review.</p>
      {capabilities.canApprove ? <>
        <label className="pw-check"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} disabled={locked || operation.revisionConflict} /><span>I reviewed revision {run.revision}, {native ? 'the recorded-time calculation' : 'the provider amounts'} and all employee details.</span></label>
        <button className="pw-button" type="button" disabled={locked || operation.revisionConflict || !reviewed || !run.reviewToken || !run.rows || !run.totals || notes.blocking.length > 0} onClick={() => run.reviewToken && void operation.submit({ action: 'APPROVE', runId: run.id, expectedRevision: run.revision, reviewToken: run.reviewToken })}>Approve revision {run.revision}<CheckCircleIcon size={18} aria-hidden /></button>
      </> : <p className="pw-notice">An authorized payroll approver must approve this revision.</p>}
    </section>}
    {native && correctionOpen && <section className="pw-section"><h3>Create a linked correction</h3><form className="pw-form" onSubmit={event => { event.preventDefault(); const reason = String(new FormData(event.currentTarget).get('nativeCorrectionReason') ?? '').trim(); if (reason) void operation.submit({ action: 'CORRECT_NATIVE', runId: run.id, expectedRevision: run.revision, reason }); }}><fieldset disabled={locked || !capabilities.canReview}><label>Correction reason<textarea name="nativeCorrectionReason" required maxLength={300} rows={3} /></label><button className="pw-button" type="submit">Create correction draft</button></fieldset></form></section>}
    {run.status === 'APPROVED' && <section className="pw-section pw-approved">
      <div className="pw-approved-heading"><CheckCircleIcon size={28} weight="duotone" aria-hidden="true" /><div><h3>Approval recorded</h3><p className="pw-small">Revision {run.revision} for {keepWhole(formatDateRange(run.period.startDate, run.period.endDate))} is approved. {native ? 'Statements publish automatically after generation and verification.' : 'Next, publish statements so employees can see their pay.'}</p></div></div><p className="pw-small">Approved {run.approvedAt ? new Date(run.approvedAt).toLocaleString() : ''} · Approver reference <code>{run.approvedBy}</code></p>
      {run.documents.length ? <div className="pw-documents">{run.documents.map(document => <DocumentLink key={document.id} document={document} />)}</div> : <PayrollState title="Documents are being prepared">Check PDF generation below. Documents appear when generation succeeds.</PayrollState>}
      {native && !run.documents.some(document => document.kind === 'EMPLOYEE_STATEMENT' && document.published) && <PayrollState title="Statements not published yet">Approved native statements publish automatically after document generation and verification. Approval alone does not mean a PDF is available.</PayrollState>}
      {!native && run.documents.some(document => document.kind === 'EMPLOYEE_STATEMENT' && !document.published) && (capabilities.canApprove ? <div className="pw-publication">
        <label className="pw-check"><input type="checkbox" checked={publishConfirmed} onChange={event => setPublishConfirmed(event.target.checked)} disabled={locked} /><span>Make the approved statements available to their employees.</span></label>
        <button className="pw-button" type="button" disabled={locked || !publishConfirmed} onClick={() => void operation.submit({ action: 'PUBLISH', runId: run.id, expectedRevision: run.revision })}>Publish employee statements</button>
      </div> : <p className="pw-notice">An authorized payroll approver must publish the employee statements.</p>)}
      <details className="pw-secondary-actions"><summary>{native ? 'Corrections and history' : 'Corrections and payment instructions'}</summary>
        <p className="pw-small">{native ? 'Corrections recalculate a separate linked draft from recorded time and current facts. The replacement requires a new review and approval; original statements stay in history.' : <>Corrections create a linked draft and require a new approval. Neutral payment instructions have unverified bank compatibility; no bank submission or payment confirmation is available.</>}</p>
        <div className="pw-actions"><button className="pw-button pw-secondary" type="button" disabled={locked || !capabilities.canReview} onClick={() => setCorrectionOpen(value => !value)}>{correctionOpen ? 'Close correction' : 'Create correction'}</button>
          {!native && capabilities.canApprove && <button className="pw-button pw-secondary" type="button" disabled={locked} onClick={() => void operation.submit({ action: 'PAYMENT_EXPORT', runId: run.id, expectedRevision: run.revision })}>Prepare payment instructions</button>}
        </div>
      </details>
    </section>}
  </PayrollPanel>;
}
