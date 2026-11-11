import 'server-only';
import {createHash} from 'node:crypto';
/** Nonsecret company namespace for this tab's pending delegated command. */
export const delegatedRecoveryScope=(workspaceId:string)=>createHash('sha256').update('nevora:delegated-time-correction:company:v1\0').update(workspaceId).digest('hex');
