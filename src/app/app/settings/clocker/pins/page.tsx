import {scopedObservation} from '@/lib/company-access/observation';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireRoles} from '@/lib/auth/permissions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {listOwnerClockerPinStatuses} from '@/lib/clocker/pin-operations.server';
import {ClockerOwnerNav} from '@/components/clocker-owner-nav';
import {ClockerPinInventory,ClockerPinsUnavailable} from '@/components/clocker-pin-inventory';
import {clockerOwnerCopy} from '@/components/clocker-owner-copy';
import {SettingsPageB} from '../../settings-b';
import {readOperationalDirectory} from '@/lib/company-access/operational-read.server';
import {listPositions} from '@/lib/data/positions';
import { SHELL_WORDS } from '@/components/shell-copy';
import {employeeRoleLabel} from '@/lib/employee-display';
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../../settings-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].clockerPins }; }
export const dynamic='force-dynamic';
export default async function ClockerPinsPage(){
 await requireRoles(['OWNER']);const proof=await requireSessionMutationProof();const lang=await readPageLang();
 const source=await withOperationalCompany(proof,async()=>{try{return await listOwnerClockerPinStatuses({employeeId:proof.employee.id,sessionTokenHash:proof.sessionTokenHash});}catch{return null;}});
 if(source.state==='unavailable')return <OperationalUnavailable lang={lang} title={SETTINGS_COPY[lang].pinsUnavailable} reason={source.reason}/>;const statuses=source.data;
 // Owner premium R13: each row names the person's position and location (Team's own reads), never their employee ID. A failed
 // read leaves the line out.
 const details=statuses?await personDetails(proof, lang).catch(()=>({})):{};
 return <ScopedReadFrame observation={scopedObservation(source)}><SettingsPageB className="c-pins-page" title={clockerOwnerCopy[lang].pinsTitle} lang={lang === "es" ? "es" : undefined}><ClockerOwnerNav current="pins"/>{statuses?<ClockerPinInventory statuses={statuses} details={details} lang={lang}/>:<ClockerPinsUnavailable lang={lang}/>}</SettingsPageB></ScopedReadFrame>;
}

/** "Barista · Condado" for each person, from the directory and position reads the Team page uses. */
async function personDetails(proof:Awaited<ReturnType<typeof requireSessionMutationProof>>, lang: "en" | "es"):Promise<Record<string,string>>{
 const [directory,positions]=await Promise.all([readOperationalDirectory(proof),listPositions({includeInactive:true}).catch(()=>[])]);
 if(directory.state!=='ready'||directory.data.mode!=='COMPANY')return {};
 const position=new Map(positions.map(item=>[item.id,item.name])),where=new Map(directory.data.locations.map(item=>[item.id,item.shortName]));
 return Object.fromEntries(directory.data.employees.map(person=>[person.id,[person.positionIds.map(id=>position.get(id)).find(Boolean)??(lang === "es" ? SHELL_WORDS.es.roles[person.role] : employeeRoleLabel(person.role)),where.get(person.primaryLocationId)].filter(Boolean).join(' · ')]));
}
