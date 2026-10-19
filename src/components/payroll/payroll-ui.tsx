'use client';
import { focusAfterRetry } from '@/components/kit/focus-after-retry';

import { ArrowsClockwiseIcon, DownloadSimpleIcon, FileTextIcon, FileCodeIcon, LockKeyIcon, WarningCircleIcon } from '@phosphor-icons/react/ssr';
import type { ReactNode } from 'react';
import type { PayrollDocument } from '@/lib/payroll/contracts';
import type { usePayrollOperation } from './use-payroll';
import { PageBand } from '@/components/kit/kit';

/** Page frame for payroll pages. Tabs between Timecards, Payroll runs, Time
 * exports and Payroll settings come from the shell's section tabs. */
export function PayrollFrame({ title, description, personal = false, children }: { title: string; description: string; personal?: boolean; children: ReactNode }) {
  // Phase 3: the employee's own pay (personal) uses the same kit band as the Payroll pages.
  return <div className={`employee-view payroll-page payroll-workflow premium-legacy-page${personal ? " premium-employee-pay" : ""}`} data-nv-page="">
    <PageBand title={title} summary={description} overlap={false} />
    <div className="nv-content premium-legacy-content">{children}</div>
  </div>;
}
export function PayrollPanel({ title, description, children, aside }: { title: string; description?: string; children: ReactNode; aside?: ReactNode }) {
  return <section className="pw-panel"><header className="pw-panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{aside}</header>{children}</section>;
}
export function PayrollState({ title, children, error = false, retry }: { title: string; children: ReactNode; error?: boolean; retry?: () => void }) {
  return <div className={`pw-state${error ? ' pw-state-error' : ''}`} role={error ? 'alert' : 'status'}>
    {error ? <WarningCircleIcon size={25} aria-hidden /> : <FileTextIcon size={25} aria-hidden />}
    <div><strong>{title}</strong><p>{children}</p>{retry && <button type="button" className="pw-button pw-secondary" onClick={() => { retry(); focusAfterRetry('.payroll-workflow .pw-toolbar', '.pw-state .pw-button'); }}><ArrowsClockwiseIcon size={18} aria-hidden />Try again</button>}</div>
  </div>;
}
export function OperationFeedback({ operation }: { operation: ReturnType<typeof usePayrollOperation> }) {
  return <div className="pw-feedback" aria-live="polite">
    {operation.error && <p className="pw-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>{operation.error}</span></p>}
    {operation.message && <p className="pw-notice">{operation.message}</p>}
    {operation.pending && <div className="pw-recovery"><strong>{operation.busy ? 'Recording action…' : 'Check an unconfirmed action'}</strong><p>Keep this reference until the server confirms the result.</p><code>{operation.pending}</code>{operation.resuming && <p>Re-enter the original action below. Its saved reference will be reused; no new action reference will be created.</p>}<div className="pw-actions"><button className="pw-button pw-secondary" type="button" disabled={operation.busy} onClick={() => void operation.check()}>Check action reference</button>{operation.retryAvailable && <button className="pw-button pw-secondary" type="button" disabled={operation.busy} onClick={() => void operation.retry()}>Retry same action</button>}{operation.resumeAvailable && <button className="pw-button pw-secondary" type="button" onClick={operation.resume}>Re-enter original action</button>}{operation.resuming && <button className="pw-button pw-secondary" type="button" onClick={operation.pauseResume}>Pause re-entry</button>}</div></div>}
  </div>;
}
export function DocumentLink({ document }: { document: PayrollDocument }) {
  return <a className="pw-document" href={`/api/payroll/documents/${encodeURIComponent(document.id)}`}>
    <span className="pw-document-icon">{document.kind === 'PAYMENT_INSTRUCTIONS' ? <FileCodeIcon size={23} weight="duotone" aria-hidden /> : <FileTextIcon size={23} weight="duotone" aria-hidden />}</span>
    <span><strong>{document.filename}</strong><small>{document.kind === 'EMPLOYEE_STATEMENT' ? (document.published ? 'Published to employee' : 'Private · not published') : 'Private company file'} · {document.kind === 'PAYMENT_INSTRUCTIONS' ? 'Neutral JSON · compatibility unverified · not submitted' : 'PDF document'}</small></span>
    <DownloadSimpleIcon size={20} aria-hidden /><span className="sr-only">Download</span>
  </a>;
}
export function PrivacyNote({ children }: { children: ReactNode }) {
  return <p className="pw-privacy"><LockKeyIcon size={17} aria-hidden />{children}</p>;
}
