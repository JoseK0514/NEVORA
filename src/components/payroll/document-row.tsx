import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import type { PayrollDocument } from '@/lib/payroll/contracts';

const KIND = { EMPLOYEE_STATEMENT: 'Pay statement', COMPANY_SUMMARY: 'Company summary', PAYMENT_INSTRUCTIONS: 'Payment instructions' } as const;

/** One payroll document as a two-line kit row (Owner premium R9): who or what it is first, then what kind of file and
 * whether employees can see it. The person's name comes from the caller's records (never the file name); the file name
 * and revision move into the Download label and its tooltip. View is the row's one teal action, Download a neutral
 * 44px icon button. */
export function DocumentRow({ document, name = null, revision }: { document: PayrollDocument; name?: string | null; revision?: number }) {
  const path = `/api/payroll/documents/${encodeURIComponent(document.id)}`;
  const statement = document.kind === 'EMPLOYEE_STATEMENT';
  const title = statement ? name ?? 'Employee statement' : KIND[document.kind];
  const detail = statement ? `${KIND.EMPLOYEE_STATEMENT} · ${document.published ? 'Shared with employee' : 'Not shared yet'}`
    : document.kind === 'PAYMENT_INSTRUCTIONS' ? 'File only · not sent to a bank' : 'For your records';
  const file = `${document.filename}${revision ? `, revision ${revision}` : ''}`;
  const subject = statement ? `${title} pay statement` : title;
  return <div className="c-row c-pay__doc c-pay__stmt">
    <span className="c-row__main"><span className="c-row__title c-row__title--b">{title}</span><span className="c-row__detail"><span>{detail}</span></span></span>
    <span className="c-pay__stmt-actions">
      {document.kind !== 'PAYMENT_INSTRUCTIONS' && document.viewUrl ? <a className="c-link c-link--l c-pay__stmt-view" href={`${path}/view`} aria-label={`View ${subject}`}>View</a> : null}
      {/* Review B5 (NV-237): one labelled Download pill (with View as a link), not a bare glyph beside View. */}
      <a className="c-btn c-btn--secondary c-btn--sm c-pay__download" href={path} title={file} aria-label={`Download ${subject} (${file})`}><DownloadSimpleIcon className="c-ic" weight="bold" aria-hidden="true" />Download</a>
    </span>
  </div>;
}
