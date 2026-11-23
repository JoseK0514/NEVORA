'use client';
import { focusAfterRetry } from '@/components/kit/focus-after-retry';

import { ArrowClockwiseIcon, DownloadSimpleIcon, EyeIcon, FileTextIcon, FileCodeIcon, LockKeyIcon, WarningCircleIcon } from '@phosphor-icons/react/ssr';
import type { ReactNode } from 'react';
import type { PayrollDocument } from '@/lib/payroll/contracts';
import type { usePayrollOperation } from './use-payroll';
import { payrollCopy, usePayrollCopy } from './payroll-copy';

/** The signed-out sentence in either language (the hook writes it in the person's language). */
const isSignedOut = (children: ReactNode) => children === payrollCopy.en.status.resource.signedOut || children === payrollCopy.es.status.resource.signedOut;
import Link from 'next/link';
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
  const { status: { ui } } = usePayrollCopy();
  return <div className={`pw-state${error ? ' pw-state-error' : ''}`} role={error ? 'alert' : 'status'}>
    {error ? <WarningCircleIcon size={22} weight="bold" aria-hidden /> : <FileTextIcon size={22} weight="bold" aria-hidden />}
    <div><strong>{title}</strong><p>{children}</p>{isSignedOut(children) ? <Link className="pw-button" href="/login">{ui.signIn}</Link> : retry && <button type="button" className="pw-button pw-secondary" onClick={() => { retry(); focusAfterRetry('.payroll-workflow .pw-toolbar', '.pw-state .pw-button'); }}><ArrowClockwiseIcon size={18} weight="bold" aria-hidden />{ui.tryAgain}</button>}</div>
  </div>;
}
export function OperationFeedback({ operation }: { operation: ReturnType<typeof usePayrollOperation> }) {
  const { status: { feedback: f } } = usePayrollCopy();
  return <div className="pw-feedback" aria-live="polite">
    {operation.error && <p className="pw-error" role="alert"><WarningCircleIcon size={18} weight="bold" aria-hidden="true" /><span>{operation.error}</span></p>}
    {operation.message && <p className="pw-notice">{operation.message}</p>}
    {operation.pending && <div className="pw-recovery"><strong>{operation.busy ? f.recording : f.checkUnconfirmed}</strong><p>{f.keepReference}</p><code>{operation.pending}</code>{operation.resuming && <p>{f.reenterNote}</p>}<div className="pw-actions"><button className="pw-button pw-secondary" type="button" disabled={operation.busy} onClick={() => void operation.check()}>{f.checkReference}</button>{operation.retryAvailable && <button className="pw-button pw-secondary" type="button" disabled={operation.busy} onClick={() => void operation.retry()}>{f.retrySame}</button>}{operation.resumeAvailable && <button className="pw-button pw-secondary" type="button" onClick={operation.resume}>{f.reenter}</button>}{operation.resuming && <button className="pw-button pw-secondary" type="button" onClick={operation.pauseResume}>{f.pause}</button>}</div></div>}
  </div>;
}
export function DocumentLink({ document }: { document: PayrollDocument }) {
  const { status: { ui } } = usePayrollCopy();
  const path = `/api/payroll/documents/${encodeURIComponent(document.id)}`;
  return <div className="pw-document">
    <span className="pw-document-icon">{document.kind === 'PAYMENT_INSTRUCTIONS' ? <FileCodeIcon size={23} weight="duotone" aria-hidden /> : <FileTextIcon size={23} weight="duotone" aria-hidden />}</span>
    <span><strong>{document.filename}</strong><small>{document.kind === 'EMPLOYEE_STATEMENT' ? (document.published ? ui.publishedToEmployee : ui.privateNotPublished) : ui.privateCompanyFile} · {document.kind === 'PAYMENT_INSTRUCTIONS' ? ui.neutralJson : ui.pdfDocument}</small></span>
    <div className="pw-document-actions">
      {document.kind !== 'PAYMENT_INSTRUCTIONS' && document.viewUrl && <a className="pw-button pw-secondary" href={`${path}/view`} aria-label={ui.viewFile(document.filename)}><EyeIcon size={18} weight="bold" aria-hidden />{ui.view}</a>}
      <a className="pw-button pw-secondary" href={path} aria-label={ui.downloadFile(document.filename)}><DownloadSimpleIcon size={18} weight="bold" aria-hidden />{ui.download}</a>
    </div>
  </div>;
}
export function PrivacyNote({ children }: { children: ReactNode }) {
  return <p className="pw-privacy"><LockKeyIcon size={16} weight="bold" aria-hidden />{children}</p>;
}
