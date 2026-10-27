import 'server-only';
import {cookies} from 'next/headers';
import type {SqlExecutor} from '../../notifications/types';
import type {SessionMutationProof} from '../../shift-changes/types';
import {neonNotificationExecutor} from '../../data/notification-transactions';
import {requireSessionMutationProof} from '../../auth/session';
import {pinManagementAccess} from '../pin-authority.server';
import {readPinKey} from '../pin-crypto.server';
import {clockerSecurity} from '../setup.server';
import {resolveCurrentClockerIdentity} from '../current-identity.server';
import type {PhotoTransportDeps,PhotoSettingsTransportDeps} from './transport';
import {ClockerPhotoService,type PhotoManagementProof,type PhotoLifecycleProvider} from './service';
import {SqlClockerPhotoRepository} from './sql-repository';
import {createCurrentClockerPhotoAuthority} from './authority.server';
import {ClockerPhotoError} from './contracts';
export interface ClockerPhotoRuntime{
 service:ClockerPhotoService;transport:PhotoTransportDeps;settingsTransport:PhotoSettingsTransportDeps;
 portalProof(session:SessionMutationProof):Promise<PhotoManagementProof>;
}
/** Dependency injection is explicit; fictional lifecycle providers belong only to owned tests. */
export function createCurrentClockerPhotoRuntime(executor:SqlExecutor,lifecycle?:PhotoLifecycleProvider,key?:Buffer):ClockerPhotoRuntime{
 const secret=key??(()=>{try{return readPinKey();}catch{return undefined;}})();
 const service=new ClockerPhotoService(new SqlClockerPhotoRepository(executor,createCurrentClockerPhotoAuthority(secret)),lifecycle),security={portalOrigin:process.env.NEVORA_CLOCKER_ORIGIN??'',production:process.env.NODE_ENV==='production'};
 const portalProof=async(session:SessionMutationProof):Promise<PhotoManagementProof>=>{
  try{if(session.employee.role!=='OWNER')throw Error();const access=await pinManagementAccess({employeeId:session.employee.id,sessionTokenHash:session.sessionTokenHash},executor);return {workspaceId:access.workspace.id,employeeId:access.proof.employee.id,sessionTokenHash:access.proof.sessionTokenHash,ownerAccess:access};}catch{throw new ClockerPhotoError('AUTH_REQUIRED');}
 };
 return {service,portalProof,transport:{enabled:true,security,service,authenticate:async(_request,location)=>{if(!key){try{readPinKey();}catch{return null;}}return (await resolveCurrentClockerIdentity(location,{executor,cookies:await cookies(),security:clockerSecurity(),key:secret}))?.proof??null;},readNotice:(proof,policy)=>service.punchNotice(proof,policy)},settingsTransport:{enabled:true,security,service,authenticate:async()=>{try{return await portalProof(await requireSessionMutationProof());}catch{return null;}}}};
}
/** Owner preferences and private review use real current-company SQL even while capture is unavailable. */
export function getClockerPhotoSettingsRuntime():ClockerPhotoRuntime{return createCurrentClockerPhotoRuntime(neonNotificationExecutor());}
/** No verified deployment cleanup/backup provider is bound in this candidate. Never activate collection from a saved preference alone. */
export function getClockerPhotoRuntime():ClockerPhotoRuntime|null{return null;}
