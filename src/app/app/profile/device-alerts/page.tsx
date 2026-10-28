import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {readNotificationConfig} from '@/lib/notifications/config';
import {EmployeeDeviceAlertsPage} from '@/components/employee-mobile/device-alerts';
export const metadata={title:'Alerts on this device'};
export default async function DeviceAlertsPage(){
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app/profile');
 return <EmployeeDeviceAlertsPage enabled={readNotificationConfig(process.env).featureEnabled}/>;
}
