import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireRoles} from '@/lib/auth/permissions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {listOwnerClockerPinStatuses} from '@/lib/clocker/pin-operations.server';
import {ClockerOwnerNav} from '@/components/clocker-owner-nav';
import {ClockerPinInventory} from '@/components/clocker-pin-inventory';
import {SettingsFrame} from '../../wave-c-kit';
export const dynamic='force-dynamic';
export default async function ClockerPinsPage(){
 await requireRoles(['OWNER']);const proof=await requireSessionMutationProof();
 const source=await withOperationalCompany(proof,async()=>{try{return await listOwnerClockerPinStatuses({employeeId:proof.employee.id,sessionTokenHash:proof.sessionTokenHash});}catch{return null;}});
 if(source.state==='unavailable')return <OperationalUnavailable title="Clocker PINs unavailable" reason={source.reason}/>;const statuses=source.data;
 return <ScopedReadFrame observation={source}><SettingsFrame back={{href:"/app/settings",label:"Settings"}} title="Employee PINs" summary="Private access to the shared Clocker."><ClockerOwnerNav current="pins"/>{statuses?<ClockerPinInventory statuses={statuses}/>:<section role="alert"><h2>PIN status is unavailable</h2><p>We could not confirm the current PIN settings.</p><a className="q-btn q-btn--sec" href="/app/settings/clocker/pins">Try again</a></section>}</SettingsFrame></ScopedReadFrame>;
}
