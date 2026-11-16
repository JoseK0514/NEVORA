import { PayrollRoute } from './payroll-route';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Payroll" };

export default async function PayrollPage() {
  return <PayrollRoute view="home" />;
}
