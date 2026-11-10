import { PayrollRoute } from '../payroll-route';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Prepare payroll" };

export default async function PayrollPreparePage() {
  return <PayrollRoute view="prepare" />;
}
