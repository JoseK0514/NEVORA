import { PayrollRoute, runParam, type PayrollSearch } from '../payroll-route';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Payroll people" };

export default async function PayrollPeoplePage({ searchParams }: { searchParams: PayrollSearch }) {
  return <PayrollRoute view="people" runId={await runParam(searchParams)} />;
}
