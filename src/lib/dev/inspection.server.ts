import 'server-only';
import {cookies,headers} from 'next/headers';
import {localDevEnabled,localRequest} from './local-only';
export type InspectionError='root'|'global'|'portal'|'home-read';
export async function forceInspectionError(state:InspectionError):Promise<void> {
  if(!localDevEnabled(process.env,'NEVORA_DEV_FORCE_ERRORS'))return;
  if(!localRequest(await headers()))return;
  if((await cookies()).get('nv-force-error')?.value===state)throw Error('Local inspection failure: '+state);
}
