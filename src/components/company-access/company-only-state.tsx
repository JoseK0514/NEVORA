import type {ReactElement} from 'react';
import type {AccessFailure} from '@/lib/company-access/model';
import type {SessionMutationProof} from '@/lib/shift-changes/types';
import {readOperationalAuthority} from '@/lib/company-access/operational-scope.server';
import {QuietSystemState} from '@/components/quiet-system-state';
import {OperationalUnavailable} from './operational-unavailable';

export const COMPANY_ONLY_SENTENCE='This is for Owners and company-wide managers. Ask an Owner if you need it.';

/** B-12: a page that stays with Owners and company-wide Managers (payroll export and period close, account recovery,
 * Clocker PINs, reports, full profiles). A location-scoped Manager gets the Quiet "Not available for your role" state
 * instead of the company-wide access message; anyone else keeps OperationalUnavailable unchanged. */
export async function companyOnlyRefusal(proof:SessionMutationProof,title:string,reason:AccessFailure):Promise<ReactElement>{
 if(reason==='access_denied'){
  let view=null;try{view=await readOperationalAuthority(proof);}catch{/* An unread scope keeps the existing message. */}
  if(view?.state==='ready'&&view.role==='MANAGER'&&view.scope?.mode==='LOCATIONS')return <QuietSystemState kind="role" sentence={COMPANY_ONLY_SENTENCE}/>;
 }
 return <OperationalUnavailable title={title} reason={reason}/>;
}
