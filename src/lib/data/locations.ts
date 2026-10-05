import { randomUUID } from 'node:crypto';
import type { Location } from '../domain';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { neonNotificationExecutor } from './notification-transactions';
import { getWorkspace, workspaceReadGuard } from './workspaces';
import type { SessionMutationProof } from "../shift-changes/types";
import { assertManagementProof, managementSessionStatements } from "./management-session";
export class LocationUnavailableError extends Error { constructor(){super('Location configuration is unavailable.');} }
export class LocationPermissionError extends Error { constructor(){super('Only an active Owner may edit locations.');} }
const fields='id, workspace_id AS "workspaceId", clocker_key AS "clockerKey", name, short_name AS "shortName", active';
export async function listLocations(options: { includeInactive?: boolean } = {}, executor: SqlExecutor = neonNotificationExecutor()): Promise<Location[]> {
 try { const workspace=await getWorkspace(executor);return await executor.query<Location>({text:`SELECT ${fields} FROM locations WHERE workspace_id=$1 ${options.includeInactive?'':'AND active=true'} ORDER BY id`,values:[workspace.id]}); }catch {throw new LocationUnavailableError();}
}
export async function findActiveLocationByClockerKey(key: string, executor: SqlExecutor = neonNotificationExecutor()): Promise<Location | null> {
 try {const workspace=await getWorkspace(executor);const rows=await executor.query<Location>({text:`SELECT ${fields} FROM locations WHERE workspace_id=$1 AND clocker_key=$2 AND active=true`,values:[workspace.id,key]});return rows[0]??null;}catch {throw new LocationUnavailableError();}
}
function names(input:{name:string;shortName:string}) {
 const name=input.name.trim(),shortName=input.shortName.trim();
 if(!name||[...name].length>160)throw new Error('Location name must contain 1–160 characters.');
 if(!shortName||[...shortName].length>48)throw new Error('Short name must contain 1–48 characters.');
 return {name,shortName};
}
function actorGuard(actorEmployeeId:string):SqlStatement[]{return [
 {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[actorEmployeeId]},
 {text:"SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees WHERE id=$1 AND active=true AND role='OWNER') THEN '1' ELSE 'location_permission_denied' END)::integer",values:[actorEmployeeId]},
];}
async function mutate(statements:SqlStatement[],executor:SqlExecutor):Promise<Location>{
 try {const results=await executor.transaction(statements);const location=results.at(-1)?.[0] as Location|undefined;if(!location)throw new Error('Location not found.');return location;}catch(error){if(error instanceof Error && error.message.includes('location_permission_denied'))throw new LocationPermissionError();throw error;}
}
export async function createLocation(input: { name: string; shortName: string; clockerKey?: string; actorEmployeeId: string; proof: SessionMutationProof }, executor?: SqlExecutor): Promise<Location> {
 assertManagementProof(input.proof,input.actorEmployeeId);
 const profile=names(input),id=randomUUID(),key=input.clockerKey??`location-${id}`;
 if(key.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key))throw new Error('Clocker key must be lowercase URL-safe text up to 64 characters.');
 const sql=executor??neonNotificationExecutor(),workspace=await getWorkspace(sql);
 return mutate([...workspaceReadGuard(workspace),...actorGuard(input.actorEmployeeId),...managementSessionStatements(input.proof,input.actorEmployeeId,['OWNER']),{text:`INSERT INTO locations(id,workspace_id,clocker_key,name,short_name,active) VALUES($1,$2,$3,$4,$5,true) RETURNING ${fields}`,values:[id,workspace.id,key,profile.name,profile.shortName]}],sql);
}
export async function updateLocation(input: { id: string; name: string; shortName: string; active: boolean; actorEmployeeId: string; proof: SessionMutationProof }, executor?: SqlExecutor): Promise<Location> {
 assertManagementProof(input.proof,input.actorEmployeeId);
 const profile=names(input);if(typeof input.active!=='boolean')throw new Error('Choose an active state.');
 const sql=executor??neonNotificationExecutor(),workspace=await getWorkspace(sql);
 return mutate([...workspaceReadGuard(workspace),...actorGuard(input.actorEmployeeId),{text:'SELECT id FROM locations WHERE id=$1 AND workspace_id=$2 ORDER BY id FOR UPDATE',values:[input.id,workspace.id]},...managementSessionStatements(input.proof,input.actorEmployeeId,['OWNER']),{text:`UPDATE locations SET name=$1,short_name=$2,active=$3 WHERE id=$4 AND workspace_id=$5 RETURNING ${fields}`,values:[profile.name,profile.shortName,input.active,input.id,workspace.id]}],sql);
}
