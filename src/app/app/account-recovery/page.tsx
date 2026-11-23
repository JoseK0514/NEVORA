import {scopedObservation} from '@/lib/company-access/observation';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireRoles} from '@/lib/auth/permissions';
import {AccountRecovery} from '@/components/account-recovery';
import {getWorkspace} from '@/lib/data/workspaces';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import type {Metadata} from 'next';
import {readPageLang} from '@/lib/i18n/page-lang.server';
import {ROUTE_PAGES_COPY} from '../route-pages-copy';

/** Review B1 (NV-022): the page title in the tab and for screen readers. Review Nov 14 (AR-15): the page's own name, as in
 * Team's row and its heading. */
export async function generateMetadata(): Promise<Metadata> {
  return { title: ROUTE_PAGES_COPY[await readPageLang()].accountRecovery.title };
}

export default async function AccountRecoveryPage({searchParams}:{searchParams?:Promise<{employee?:string;from?:string}>} = {}) {
 const actor=await requireRoles(['OWNER','MANAGER']);
 const access=await withOperationalCompany(await requireSessionMutationProof(),async()=>null);
 if(access.state==='unavailable')return <OperationalUnavailable lang={await readPageLang()} title={ROUTE_PAGES_COPY[await readPageLang()].accountRecovery.unavailable} reason={access.reason}/>;
 const params=await searchParams;
 // Only a prefill; the server still checks the employee and attestation.
 const employee=params?.employee?.trim().slice(0,200)||undefined;
 const {timeZone}=await getWorkspace();
 return <ScopedReadFrame observation={scopedObservation(access)}><AccountRecovery kind="assisted" actorId={actor.id} employeeId={employee} timeZone={timeZone} from={params?.from==='settings'&&actor.role==='OWNER'?'settings':undefined} pins={actor.role==='OWNER'}/></ScopedReadFrame>;
}
