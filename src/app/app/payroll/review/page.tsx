import { PayrollRoute, runParam, type PayrollSearch } from '../payroll-route';
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { ROUTE_COPY } from '../../route-copy';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: ROUTE_COPY[await readPageLang()].reviewPayroll }; }

export default async function PayrollReviewPage({ searchParams }: { searchParams: PayrollSearch }) {
  return <PayrollRoute view="review" runId={await runParam(searchParams)} />;
}
