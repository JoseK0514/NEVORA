import { PayrollRoute, runParam, type PayrollSearch } from '../payroll-route';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Fix payroll" };

export default async function PayrollFixPage({ searchParams }: { searchParams: PayrollSearch }) {
  return <PayrollRoute view="fix" runId={await runParam(searchParams)} />;
}
