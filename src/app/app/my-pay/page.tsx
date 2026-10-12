import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { payrollFeatureEnabled } from '@/lib/payroll/service';
import { MyPay } from '@/components/payroll/my-pay';
import '../payroll-export/payroll-page.css';
import '../payroll/payroll-workflow.css';

export default async function MyPayPage() {
  if (!payrollFeatureEnabled()) notFound();
  const session = await requireSession();
  return <MyPay key={session.id} />;
}
