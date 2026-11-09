import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireRoles} from '@/lib/auth/permissions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {listOwnerClockerPinStatuses} from '@/lib/clocker/pin-operations.server';
import {ClockerOwnerNav} from '@/components/clocker-owner-nav';
import {ClockerPinInventory} from '@/components/clocker-pin-inventory';
import {SettingsFrame} from '../../wave-c-kit';
import {readOperationalDirectory} from '@/lib/company-access/operational-read.server';
import {listPositions} from '@/lib/data/positions';
import {employeeRoleLabel} from '@/lib/employee-display';
export const dynamic='force-dynamic';
export default async function ClockerPinsPage(){
 await requireRoles(['OWNER']);const proof=await requireSessionMutationProof();
 const source=await withOperationalCompany(proof,async()=>{try{return await listOwnerClockerPinStatuses({employeeId:proof.employee.id,sessionTokenHash:proof.sessionTokenHash});}catch{return null;}});
 if(source.state==='unavailable')return <OperationalUnavailable title="Clocker PINs unavailable" reason={source.reason}/>;const statuses=source.data;
 // Owner premium R13: each row names the person's position and location (Team's own reads), never their employee ID. A failed
 // read leaves the line out.
 const details=statuses?await personDetails(proof).catch(()=>({})):{};
 // eslint-disable-next-line @next/next/no-html-link-for-pages -- the "Try again" link: a retry after a failed server read reloads the whole document so every read runs again, with or without JavaScript
 return <ScopedReadFrame observation={source}><SettingsFrame back={{href:"/app/settings",label:"Settings"}} title="Clocker PINs" summary="Private access to the shared Clocker."><ClockerOwnerNav current="pins"/>{statuses?<ClockerPinInventory statuses={statuses} details={details}/>:<section role="alert"><h2>Couldn’t load Clocker PINs</h2><p>Check your connection, then try again.</p><a className="q-btn q-btn--sec" href="/app/settings/clocker/pins">Try again</a></section>}</SettingsFrame></ScopedReadFrame>;
}

/** "Barista · Condado" for each person, from the directory and position reads the Team page uses. */
async function personDetails(proof:Awaited<ReturnType<typeof requireSessionMutationProof>>):Promise<Record<string,string>>{
 const [directory,positions]=await Promise.all([readOperationalDirectory(proof),listPositions({includeInactive:true}).catch(()=>[])]);
 if(directory.state!=='ready'||directory.data.mode!=='COMPANY')return {};
 const position=new Map(positions.map(item=>[item.id,item.name])),where=new Map(directory.data.locations.map(item=>[item.id,item.shortName]));
 return Object.fromEntries(directory.data.employees.map(person=>[person.id,[person.positionIds.map(id=>position.get(id)).find(Boolean)??employeeRoleLabel(person.role),where.get(person.primaryLocationId)].filter(Boolean).join(' · ')]));
}
