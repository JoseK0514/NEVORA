import 'server-only';
import {createHash} from 'node:crypto';
import {requireSessionMutationProof} from '../auth/session';
import type {SessionMutationProof} from '../shift-changes/types';

/** Public intent binding, domain separated from the server-only mutation proof.
 * This digest cannot authenticate a request; the actual cookie/SQL guards still do.
 */
export function correctionAuthority(proof:SessionMutationProof):string {
  return createHash('sha256').update('nevora:time-correction:intent:v1\0')
    .update(proof.employee.id).update('\0').update(proof.sessionTokenHash).digest('hex');
}

export async function matchesCorrectionAuthority(binding:string|null):Promise<boolean> {
  if(!binding||!/^[a-f0-9]{64}$/.test(binding))return false;
  try{return binding===correctionAuthority(await requireSessionMutationProof());}
  catch{return false;}
}
