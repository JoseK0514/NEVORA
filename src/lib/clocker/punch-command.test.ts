import { expect, it } from 'vitest';
import { parsePunchCommand } from './punch-command';
const base = {
 commandId: 'e5616987-26a9-46d2-829b-d69b611be658', action: 'CLOCK_IN', expectedRevision: 0,
 expectedEntryId: null, expectedEntryVersion: null, expectedBreakId: null, expectedBreakVersion: null,
};
it('accepts an explicit off-clock revision without employee or client time fields',()=>{
 expect(parsePunchCommand(base)).toEqual(base);
});
it.each(['START_BREAK','END_BREAK','CLOCK_OUT'])('accepts a version-bound %s', action=>{
 const command={...base,action,expectedRevision:3,expectedEntryId:'legacy-entry',expectedEntryVersion:2,
  ...(action==='END_BREAK'?{expectedBreakId:'break-1',expectedBreakVersion:1}:{})};
 expect(parsePunchCommand(command)).toEqual(command);
});
it.each([
 {...base,employeeId:'forged'}, {...base,deviceId:'forged'}, {...base,clockInAt:'2030-01-01'},
 {...base,expectedRevision:-1}, {...base,expectedRevision:1.2}, {...base,expectedRevision:'0'},
 {...base,expectedRevision:2147483648}, {...base,commandId:'not-uuid'}, {...base,action:'PUBLISH'},
 {...base,expectedEntryId:'entry'}, {...base,expectedBreakId:'break'},
 {...base,action:'START_BREAK'}, {...base,action:'END_BREAK'},
 {...base,action:'CLOCK_OUT'}, {...base,extra:true}, null, [], 'CLOCK_IN',
])('rejects malformed or forged input without echoing submitted values', input=>{
 expect(()=>parsePunchCommand(input)).toThrow('Invalid punch command. Refresh the tablet state before continuing.');
});
it('does not silently ignore a missing expectation',()=>{
 const {expectedBreakVersion: _unused,...missing}=base;
 expect(()=>parsePunchCommand(missing)).toThrow();
});
it('does not coerce array-valued actions into authorized action names',()=>{
 expect(()=>parsePunchCommand({...base,action:['CLOCK_IN']})).toThrow();
});
it('requires a string action even when an array has valid entry expectations',()=>{
 expect(()=>parsePunchCommand({...base,action:['CLOCK_OUT'],expectedEntryId:'entry-1',expectedEntryVersion:1})).toThrow();
});
