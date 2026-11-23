import {readPageLang} from '@/lib/i18n/page-lang.server';
import {PROFILE_COPY} from '../profile-copy';
import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {readNotificationConfig} from '@/lib/notifications/config';
import {EmployeeDeviceAlertsPage} from '@/components/employee-mobile/device-alerts';
import {headers} from 'next/headers';
import {nativeContext} from '@/lib/native-shell/context';
import {readNativeRegistrationConfig} from '@/lib/native-push/config';
export async function generateMetadata(){return {title:PROFILE_COPY[await readPageLang()].deviceAlerts};}
export default async function DeviceAlertsPage(){
 // Review F2 (NV-100): an Owner's or Manager's device alerts are a row of their Profile; the link lands on it.
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app/profile#profile-device-alerts');
 const nativeApp=nativeContext((await headers()).get('user-agent'));
 return <EmployeeDeviceAlertsPage nativeApp={nativeApp} enabled={nativeApp?!!readNativeRegistrationConfig(process.env):readNotificationConfig(process.env).featureEnabled}/>;
}
