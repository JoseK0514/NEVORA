import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import type { PayrollDocument } from '@/lib/payroll/contracts';
import { usePayrollCopy } from './payroll-copy';

/** One payroll document as a two-line kit row (Owner premium R9): who or what it is first, then what kind of file and
 * whether employees can see it. The person's name comes from the caller's records (never the file name); the file name
 * and revision move into the Download label and its tooltip. View is the row's one teal action, Download a neutral
 * 44px icon button. */
export function DocumentRow({ document, name = null, revision }: { document: PayrollDocument; name?: string | null; revision?: number }) {
  const { myPay: t } = usePayrollCopy();
  const KIND = t.kind;
  const path = `/api/payroll/documents/${encodeURIComponent(document.id)}`;
  const statement = document.kind === 'EMPLOYEE_STATEMENT';
  const title = statement ? name ?? t.employeeStatement : KIND[document.kind];
  const detail = statement ? `${KIND.EMPLOYEE_STATEMENT} · ${document.published ? t.sharedWithEmployee : t.notShared}`
    : document.kind === 'PAYMENT_INSTRUCTIONS' ? t.fileOnly : t.forRecords;
  const file = revision ? t.revision(document.filename, revision) : document.filename;
  const subject = statement ? t.personStatement(title) : title;
  return <div className="c-row c-pay__doc c-pay__stmt">
    <span className="c-row__main"><span className="c-row__title c-row__title--b">{title}</span><span className="c-row__detail"><span>{detail}</span></span></span>
    <span className="c-pay__stmt-actions">
      {document.kind !== 'PAYMENT_INSTRUCTIONS' && document.viewUrl ? <a className="c-link c-link--l c-pay__stmt-view" href={`${path}/view`} aria-label={t.viewSubject(subject)}>{t.view}</a> : null}
      {/* Review B5 (NV-237): one labelled Download pill (with View as a link), not a bare glyph beside View. */}
      <a className="c-btn c-btn--secondary c-btn--sm c-pay__download" href={path} title={file} aria-label={t.downloadSubject(subject, file)}><DownloadSimpleIcon className="c-ic" weight="bold" aria-hidden="true" />{t.download}</a>
    </span>
  </div>;
}
