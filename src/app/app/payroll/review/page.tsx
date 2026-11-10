import { PayrollRoute, runParam, type PayrollSearch } from '../payroll-route';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Review payroll" };

export default async function PayrollReviewPage({ searchParams }: { searchParams: PayrollSearch }) {
  return <PayrollRoute view="review" runId={await runParam(searchParams)} />;
}
