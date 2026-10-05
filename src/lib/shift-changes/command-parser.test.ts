import { expect,it } from 'vitest';
import { parseShiftChangeCommand,isShiftChangeCommand } from './command-parser';
const command={kind:'ACCEPT',operationId:'d2d7d243-a4d4-4fd6-b720-d5be3dc2f9e8',requestId:'request',expectedRevision:1};
it('A003 accepts finite business input and framework metadata',()=>{
 const form=new FormData();for(const [k,v]of Object.entries(command))form.set(k,String(v));form.set('$ACTION_ID_abc','');
 expect(parseShiftChangeCommand(form)).toEqual(command);expect(isShiftChangeCommand(command)).toBe(true);
});
it('A004 rejects duplicate business fields, forged authority and unsafe revisions',()=>{
 for(const patch of [{employeeId:'other'},{expectedRevision:0},{expectedRevision:1.5},{expectedRevision:Number.MAX_SAFE_INTEGER+1},{operationId:'no'},{kind:'SYSTEM'},{requestId:'x'.repeat(129)}])expect(isShiftChangeCommand({...command,...patch})).toBe(false);
 const form=new FormData();for(const [k,v]of Object.entries(command))form.set(k,String(v));form.append('requestId','other');expect(parseShiftChangeCommand(form)).toBeNull();
});
it('A065 bounds absence notes and rejects unknown reasons',()=>{
 expect(isShiftChangeCommand({kind:'SUBMIT_CALLOUT',operationId:command.operationId,sourceShiftId:'s',reasonCode:'OTHER',reasonNote:'x'.repeat(2000)})).toBe(true);
 expect(isShiftChangeCommand({kind:'SUBMIT_CALLOUT',operationId:command.operationId,sourceShiftId:'s',reasonCode:'OTHER',reasonNote:'x'.repeat(2001)})).toBe(false);
 expect(isShiftChangeCommand({kind:'SUBMIT_CALLOUT',operationId:command.operationId,sourceShiftId:'s',reasonCode:'FORGED'})).toBe(false);
});
