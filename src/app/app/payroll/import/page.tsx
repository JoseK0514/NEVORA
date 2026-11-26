import { PayrollRoute, runParam, type PayrollSearch } from '../payroll-route';
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { ROUTE_COPY } from '../../route-copy';

/** U01: import pay from another payroll system (CSV or JSON), for one payroll. */
export async function generateMetadata() { return { title: ROUTE_COPY[await readPageLang()].importPay }; }

export default async function PayrollImportPage({ searchParams }: { searchParams: PayrollSearch }) {
  return <PayrollRoute view="import" runId={await runParam(searchParams)} />;
}
