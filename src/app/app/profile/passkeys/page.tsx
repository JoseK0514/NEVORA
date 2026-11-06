import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {EmployeePasskeySection} from '@/components/employee-mobile/passkeys';
import {EmployeeAccountFrame} from '@/components/employee-mobile/profile';
import {passkeysFlagOn} from '@/lib/passkeys/client';
import {EmployeeHeroB} from '@/components/employee-b/account-b';

export const metadata={title:'Passkeys'};
/** Profile → Security → Passkeys: the passkey owner that used to sit inside Profile, as its own page. */
export default async function PasskeysPage(){
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD'].includes(proof.employee.role)||!passkeysFlagOn())redirect('/app/profile');
 const authority=employeeViewAuthority(proof,'passkeys');
 const back={href:'/app/profile#profile-passkeys',label:'Profile'};
 // Direction B on an Employee's phone: the screen's hero, with the passkey owner kept under it (b-keep).
 return <EmployeeAccountFrame title="Passkeys" back={back}><EmployeeHeroB title="Passkeys" titleId="b-passkeys-title" back={back}/><div className="b-keep eb-keep"><EmployeePasskeySection key={authority} authority={authority}/></div></EmployeeAccountFrame>;
}
