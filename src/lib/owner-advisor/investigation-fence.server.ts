import 'server-only';
import type { SqlStatement } from '@/lib/notifications/types';
export type InvestigationFence={before:SqlStatement[];after:SqlStatement[];expiresAt:string;checkFlags:()=>void};
/** Call in business-then-weekly order. Both callers start at workspace NO KEY
 * UPDATE; composition never upgrades an already acquired workspace SHARE lock. */
export function composeInvestigationFences(...values:(InvestigationFence|undefined)[]):InvestigationFence|undefined{
 const fences=values.filter((v):v is InvestigationFence=>v!==undefined);if(!fences.length)return undefined;
 return {before:fences.flatMap(f=>f.before),after:fences.flatMap(f=>f.after),expiresAt:new Date(Math.min(...fences.map(f=>Date.parse(f.expiresAt)))).toISOString(),checkFlags:()=>fences.forEach(f=>f.checkFlags())};
}
