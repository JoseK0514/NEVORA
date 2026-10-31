import { PayrollRoute, runParam, type PayrollSearch } from '../payroll-route';

export default async function PayrollPeoplePage({ searchParams }: { searchParams: PayrollSearch }) {
  return <PayrollRoute view="people" runId={await runParam(searchParams)} />;
}
