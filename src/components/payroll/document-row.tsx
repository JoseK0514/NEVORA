import type { PayrollDocument } from '@/lib/payroll/contracts';

/** One payroll document as a kit row: its name and status, with View and Download. */
export function DocumentRow({ document }: { document: PayrollDocument }) {
  const path = `/api/payroll/documents/${encodeURIComponent(document.id)}`;
  const status = document.kind === 'EMPLOYEE_STATEMENT' ? (document.published ? 'Published to employee' : 'Private · not published') : document.kind === 'PAYMENT_INSTRUCTIONS' ? 'Neutral JSON · not submitted' : 'Company file';
  return <div className="c-row c-pay__doc">
    <span className="c-row__main"><span className="c-row__title c-row__title--b">{document.filename}</span><span className="c-row__detail"><span>{status}</span></span></span>
    <span className="c-row__trail">
      {document.kind !== 'PAYMENT_INSTRUCTIONS' && document.viewUrl ? <a className="c-link c-link--l" href={`${path}/view`} aria-label={`View ${document.filename}`}>View</a> : null}
      <a className="c-link c-link--l" href={path} aria-label={`Download ${document.filename}`}>Download</a>
    </span>
  </div>;
}
