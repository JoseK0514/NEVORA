import {expect,it} from 'vitest';
import {validManagerReminderCommand} from './validation';
const base={operationId:'11111111-1111-4111-8111-111111111111',authority:'a'.repeat(64),employeeId:'employee'};
it('accepts only a revision/deadline-bound single-recipient action',()=>{
 expect(validManagerReminderCommand({...base,kind:'AVAILABILITY',weekStart:'2026-11-16',expectedDeadline:'2026-11-15T17:00:00.000Z'})).toBe(true);
 expect(validManagerReminderCommand({...base,kind:'COMMUNICATION',communicationId:base.operationId,expectedRevisionId:base.operationId})).toBe(true);
});
it('rejects invalid or unbound sources and bulk/direct-send fields',()=>{
 const valid={...base,kind:'AVAILABILITY',weekStart:'2026-11-16',expectedDeadline:'2026-11-15T17:00:00.000Z'};
 for(const input of [null,{}, {...valid,weekStart:'2026-11-17'},{...valid,weekStart:'2026-02-30'},{...valid,expectedDeadline:'tomorrow'},{...valid,employeeId:''},{...valid,recipientIds:['other']},{...valid,email:'someone@example.invalid'},{...valid,authority:'bad'}])expect(validManagerReminderCommand(input)).toBe(false);
});
