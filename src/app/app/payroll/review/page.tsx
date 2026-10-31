import { PayrollRoute, runParam, type PayrollSearch } from '../payroll-route';

export default async function PayrollReviewPage({ searchParams }: { searchParams: PayrollSearch }) {
  return <PayrollRoute view="review" runId={await runParam(searchParams)} />;
}
