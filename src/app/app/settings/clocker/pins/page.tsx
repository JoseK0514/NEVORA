import {requireRoles} from '@/lib/auth/permissions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {listOwnerClockerPinStatuses} from '@/lib/clocker/pin-operations.server';
import {ClockerOwnerNav} from '@/components/clocker-owner-nav';
import {ClockerPinInventory} from '@/components/clocker-pin-inventory';
import {SettingsFrame} from '../../wave-c-kit';
export const dynamic='force-dynamic';
export default async function ClockerPinsPage(){
 await requireRoles(['OWNER']);const proof=await requireSessionMutationProof();
 let statuses;try{statuses=await listOwnerClockerPinStatuses({employeeId:proof.employee.id,sessionTokenHash:proof.sessionTokenHash});}catch{/* Unavailable is not an empty PIN inventory. */}
 return <SettingsFrame title="Employee PINs" summary="Private access to the shared Clocker."><ClockerOwnerNav current="pins"/>{statuses?<ClockerPinInventory statuses={statuses}/>:<section role="alert"><h2>PIN status is unavailable</h2><p>We could not confirm the current PIN settings.</p><a className="q-btn q-btn--sec" href="/app/settings/clocker/pins">Try again</a></section>}</SettingsFrame>;
}
