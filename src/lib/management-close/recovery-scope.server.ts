import 'server-only';
import {createHash} from 'node:crypto';
/** Nonsecret journal namespace, not a grant. Do not mix identical employee IDs across companies. */
export function managementRecoveryScope(workspaceId:string):string {
 return createHash('sha256').update('nevora:management-close:company-recovery:v1\0').update(workspaceId).digest('hex');
}
