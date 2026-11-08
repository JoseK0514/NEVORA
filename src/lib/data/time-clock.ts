import {MANAGER_ROLES,requireRoles} from '@/lib/auth/permissions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {applicationSql} from "@/lib/data/app-sql";
import type {ClockMonitor} from '@/lib/time-clock';
import {readClockMonitor} from './clock-monitor.server';

/** Manager boundary derives authority from the actual portal cookie, never client IDs. */
export async function getClockMonitor():Promise<ClockMonitor>{
 await requireRoles(MANAGER_ROLES);
 try{
  applicationSql(); // Preserve the explicit not-configured state without hiding role redirects.
  return await readClockMonitor(await requireSessionMutationProof());
 }catch(error){
  if(error instanceof Error&&error.message==='DATABASE_URL is not configured.')return {state:'unavailable',reason:'not_configured'};
  // A revoked/expired proof or transport failure must not produce a healthy empty list.
  return {state:'unavailable',reason:'read_failed'};
 }
}
