import { PayrollRoute, runParam, type PayrollSearch } from '../payroll-route';

/** U01: import pay from another payroll system (CSV or JSON), for one payroll. */
export const metadata = { title: "Import pay" };

export default async function PayrollImportPage({ searchParams }: { searchParams: PayrollSearch }) {
  return <PayrollRoute view="import" runId={await runParam(searchParams)} />;
}
