// Child validation scenarios retained against the canonical command envelope.
import { expect, it } from 'vitest';
import { parsePunchCommand } from './punch-command';
const base={commandId:'e5616987-26a9-46d2-829b-d69b611be658',action:'CLOCK_IN',verificationId:'a'.repeat(64),expected:{revision:0,timeEntryId:null,timeEntryVersion:null,breakEntryId:null,breakEntryVersion:null}};
it('accepts an explicit off-clock revision without employee or client time fields',()=>{expect(parsePunchCommand(base)).toEqual(base);});
it.each(['START_BREAK','END_BREAK','CLOCK_OUT'])('accepts a version-bound %s',action=>{
 const command={...base,action,expected:{...base.expected,revision:3,timeEntryId:'legacy-entry',timeEntryVersion:2,...(action==='END_BREAK'?{breakEntryId:'break-1',breakEntryVersion:1}:{})},...(action==='START_BREAK'?{breakType:{id:'rest',version:1}}:{})};
 expect(parsePunchCommand(command)).toEqual(command);
});
it.each([
 {...base,employeeId:'forged'},{...base,deviceId:'forged'},{...base,clockInAt:'2030-01-01'},
 ...[-1,1.2,'0',2147483648].map(revision=>({...base,expected:{...base.expected,revision}})),
 {...base,commandId:'not-uuid'},{...base,action:'PUBLISH'},
 {...base,expected:{...base.expected,timeEntryId:'entry'}},{...base,expected:{...base.expected,breakEntryId:'break'}},
 {...base,action:'START_BREAK',breakType:{id:'rest',version:1}},{...base,action:'END_BREAK'},{...base,action:'CLOCK_OUT'},
 {...base,extra:true},null,[],'CLOCK_IN',
])('rejects malformed or forged input without echoing submitted values',input=>{expect(()=>parsePunchCommand(input)).toThrow('Check the clock action and reload its current state.');});
it('does not silently ignore a missing expectation',()=>{
 const {breakEntryVersion:_unused,...missing}=base.expected;expect(()=>parsePunchCommand({...base,expected:missing})).toThrow();
});
it('does not coerce array-valued actions into authorized action names',()=>{expect(()=>parsePunchCommand({...base,action:['CLOCK_IN']})).toThrow();});
it('requires a string action even when an array has valid entry expectations',()=>{expect(()=>parsePunchCommand({...base,action:['CLOCK_OUT'],expected:{...base.expected,timeEntryId:'entry-1',timeEntryVersion:1}})).toThrow();});
