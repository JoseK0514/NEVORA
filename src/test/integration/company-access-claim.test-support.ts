import {randomUUID} from 'node:crypto';
import {readInvitationStatus,issueOrRevokeInvitation} from '../../lib/auth/invitations/service.server';
import {companyAccessFixture} from './company-access-fixture';
export type ClaimFixture=Awaited<ReturnType<typeof companyAccessFixture>>;
export const ownedPassword='Fictional-activation-password-49';
export async function issued(f:ClaimFixture,employeeId='target'){
 const status=await readInvitationStatus(f.owner,employeeId,f.db.executor);if(status.state!=='ready')throw Error('Owned invitation status');
 let proof='';
 const result=await issueOrRevokeInvitation(f.owner,employeeId,{action:'ISSUE',operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:status.invitationRevision},
  {async send(input){proof=input.proof;return {providerAccepted:true};}},f.db.executor);
 if(result.state!=='saved'||!proof)throw Error('Owned invitation issue');
 return {proof,receipt:result.receipt};
}
