import { PayrollRoute, runParam, type PayrollSearch } from '../payroll-route';

export default async function PayrollFixPage({ searchParams }: { searchParams: PayrollSearch }) {
  return <PayrollRoute view="fix" runId={await runParam(searchParams)} />;
}
