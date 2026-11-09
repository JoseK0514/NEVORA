import {it,expect} from 'vitest';
import {parseInvitationBatchCommand,invitationChildOperationId} from './invitation-batch.server';
it('bounds and canonicalizes the explicitly selected target review without accepting caller authority',()=>{
 const c={schemaVersion:1,operationId:'12345678-1234-4234-8234-123456789012',expectedVersion:'1',payload:{targets:[{employeeId:'EMP-1',expectedEmployeeVersion:'2026-11-08 01:00:00.000001+00',expectedInvitationRevision:0}]}};
 expect(parseInvitationBatchCommand(c)).not.toBeNull();expect(parseInvitationBatchCommand({...c,payload:{...c.payload,role:'OWNER'}})).toBeNull();expect(parseInvitationBatchCommand({...c,payload:{targets:[c.payload.targets[0],c.payload.targets[0]]}})).toBeNull();
 expect(invitationChildOperationId('company','owner',c.operationId,'EMP-1')).toBe(invitationChildOperationId('company','owner',c.operationId,'EMP-1'));expect(invitationChildOperationId('other','owner',c.operationId,'EMP-1')).not.toBe(invitationChildOperationId('company','owner',c.operationId,'EMP-1'));
});
