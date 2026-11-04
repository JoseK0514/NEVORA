import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {readNotificationConfig} from '@/lib/notifications/config';
import {EmployeeDeviceAlertsPage} from '@/components/employee-mobile/device-alerts';
import {headers} from 'next/headers';
import {nativeContext} from '@/lib/native-shell/context';
import {readNativeRegistrationConfig} from '@/lib/native-push/config';
export const metadata={title:'Alerts on this device'};
export default async function DeviceAlertsPage(){
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app/profile');
 const nativeApp=nativeContext((await headers()).get('user-agent'));
 return <EmployeeDeviceAlertsPage nativeApp={nativeApp} enabled={nativeApp?!!readNativeRegistrationConfig(process.env):readNotificationConfig(process.env).featureEnabled}/>;
}
