import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import type { PayrollDocument } from '@/lib/payroll/contracts';

/** One payroll document as a kit row: its name and status, then View (the row's one teal action) and Download as a
 * neutral icon button (Owner premium, visual-craft H). */
export function DocumentRow({ document }: { document: PayrollDocument }) {
  const path = `/api/payroll/documents/${encodeURIComponent(document.id)}`;
  const status = document.kind === 'EMPLOYEE_STATEMENT' ? (document.published ? 'Published to employee' : 'Private · not published') : document.kind === 'PAYMENT_INSTRUCTIONS' ? 'Neutral JSON · not submitted' : 'Company file';
  return <div className="c-row c-pay__doc c-pay__stmt">
    <span className="c-row__main"><span className="c-row__title c-row__title--b">{document.filename}</span><span className="c-row__detail"><span>{status}</span></span></span>
    <span className="c-pay__stmt-actions">
      {document.kind !== 'PAYMENT_INSTRUCTIONS' && document.viewUrl ? <a className="c-link c-link--l c-pay__stmt-view" href={`${path}/view`} aria-label={`View ${document.filename}`}>View</a> : null}
      <a className="c-pay__icon-btn" href={path} aria-label={`Download ${document.filename}`}><DownloadSimpleIcon className="c-ic" aria-hidden="true" /></a>
    </span>
  </div>;
}
