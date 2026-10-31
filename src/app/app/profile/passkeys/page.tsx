import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {EmployeePasskeySection} from '@/components/employee-mobile/passkeys';
import {EmployeeAccountFrame} from '@/components/employee-mobile/profile';
import {passkeysFlagOn} from '@/lib/passkeys/client';

export const metadata={title:'Passkeys'};
/** Profile → Security → Passkeys: the passkey owner that used to sit inside Profile, as its own page. */
export default async function PasskeysPage(){
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD'].includes(proof.employee.role)||!passkeysFlagOn())redirect('/app/profile');
 const authority=employeeViewAuthority(proof,'passkeys');
 return <EmployeeAccountFrame title="Passkeys" back={{href:'/app/profile#profile-passkeys',label:'Profile'}}><EmployeePasskeySection key={authority} authority={authority}/></EmployeeAccountFrame>;
}
