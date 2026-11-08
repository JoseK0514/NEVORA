import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {EmployeeProfilePage} from '@/components/employee-mobile/profile';
import {policiesVisible} from '@/lib/legal/policies';
import {ManagerProfilePage} from '@/components/manager-profile/manager-profile';
import {readAuthLang} from '@/lib/auth-lang.server';

export const metadata = { title: "Profile" };
/** Board E-Profile. The calendar link and passkeys moved to their own pages (/app/profile/calendar, /passkeys). */
export default async function ProfilePage(){
 const proof=await requireSessionMutationProof();if(['OWNER','MANAGER'].includes(proof.employee.role))return <ManagerProfilePage proof={proof}/>;if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app');
 return <EmployeeProfilePage authority={employeeViewAuthority(proof,'profile')} lang={await readAuthLang()} policies={policiesVisible()} lead={proof.employee.role==='LEAD'}/>;
}
