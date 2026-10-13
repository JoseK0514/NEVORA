'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DownloadSimpleIcon, EyeIcon, FileTextIcon, FileCodeIcon, LockKeyIcon, WarningCircleIcon } from '@phosphor-icons/react/ssr';
import type { ReactNode } from 'react';
import type { PayrollDocument } from '@/lib/payroll/contracts';
import type { usePayrollOperation } from './use-payroll';
import { PayrollExportMotion } from '@/components/payroll-export-motion';

export function PayrollFrame({ title, description, settings = false, personal = false, children }: { title: string; description: string; settings?: boolean; personal?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  return <div className="employee-view payroll-page payroll-workflow">
    <header className="payroll-page-heading"><div className="payroll-page-mark"><PayrollExportMotion kind={personal ? 'statement' : pathname === '/app/settings/payroll' ? 'settings' : 'payroll'} /></div><div><h1>{title}</h1><p>{description}</p></div></header>
    {!personal && <nav className="pw-tabs" aria-label="Payroll pages">
      <Link href="/app/timecards">Timecards</Link>
      <Link href="/app/payroll" aria-current={pathname === '/app/payroll' ? 'page' : undefined}>Payroll runs</Link>
      <Link href="/app/payroll-export">Time exports</Link>
      {settings && <Link href="/app/settings/payroll" aria-current={pathname === '/app/settings/payroll' ? 'page' : undefined}>Payroll settings</Link>}
    </nav>}
    {children}
  </div>;
}
export function PayrollPanel({ title, description, children, aside }: { title: string; description?: string; children: ReactNode; aside?: ReactNode }) {
  return <section className="pw-panel"><header className="pw-panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{aside}</header>{children}</section>;
}
export function PayrollState({ title, children, error = false, retry }: { title: string; children: ReactNode; error?: boolean; retry?: () => void }) {
  return <div className={`pw-state${error ? ' pw-state-error' : ''}`} role={error ? 'alert' : 'status'}>
    {error ? <WarningCircleIcon size={25} aria-hidden /> : <FileTextIcon size={25} aria-hidden />}
    <div><strong>{title}</strong><p>{children}</p>{retry && <button type="button" className="pw-button pw-secondary" onClick={retry}>Try again</button>}</div>
  </div>;
}
export function OperationFeedback({ operation }: { operation: ReturnType<typeof usePayrollOperation> }) {
  return <div className="pw-feedback" aria-live="polite">
    {operation.error && <p className="pw-error" role="alert">{operation.error}</p>}
    {operation.message && <p className="pw-notice">{operation.message}</p>}
    {operation.pending && <div className="pw-recovery"><strong>{operation.busy ? 'Recording action…' : 'Check an unconfirmed action'}</strong><p>Keep this reference until the server confirms the result.</p><code>{operation.pending}</code>{operation.resuming && <p>Re-enter the original action below. Its saved reference will be reused; no new action reference will be created.</p>}<div className="pw-actions"><button className="pw-button pw-secondary" type="button" disabled={operation.busy} onClick={() => void operation.check()}>Check action reference</button>{operation.retryAvailable && <button className="pw-button pw-secondary" type="button" disabled={operation.busy} onClick={() => void operation.retry()}>Retry same action</button>}{operation.resumeAvailable && <button className="pw-button pw-secondary" type="button" onClick={operation.resume}>Re-enter original action</button>}{operation.resuming && <button className="pw-button pw-secondary" type="button" onClick={operation.pauseResume}>Pause re-entry</button>}</div></div>}
  </div>;
}
export function DocumentLink({ document }: { document: PayrollDocument }) {
  const path = `/api/payroll/documents/${encodeURIComponent(document.id)}`;
  return <div className="pw-document">
    <span className="pw-document-icon">{document.kind === 'PAYMENT_INSTRUCTIONS' ? <FileCodeIcon size={23} weight="duotone" aria-hidden /> : <FileTextIcon size={23} weight="duotone" aria-hidden />}</span>
    <span><strong>{document.filename}</strong><small>{document.kind === 'EMPLOYEE_STATEMENT' ? (document.published ? 'Published to employee' : 'Private · not published') : 'Private company file'} · {document.kind === 'PAYMENT_INSTRUCTIONS' ? 'Neutral JSON · compatibility unverified · not submitted' : 'PDF document'}</small></span>
    <div className="pw-document-actions">
      {document.kind !== 'PAYMENT_INSTRUCTIONS' && document.viewUrl && <a className="pw-button pw-secondary" href={`${path}/view`} aria-label={`View ${document.filename}`}><EyeIcon size={18} aria-hidden />View</a>}
      <a className="pw-button pw-secondary" href={path} aria-label={`Download ${document.filename}`}><DownloadSimpleIcon size={18} aria-hidden />Download</a>
    </div>
  </div>;
}
export function PrivacyNote({ children }: { children: ReactNode }) {
  return <p className="pw-privacy"><LockKeyIcon size={17} aria-hidden />{children}</p>;
}
