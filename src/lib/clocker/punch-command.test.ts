import { expect, it } from 'vitest';
import { parsePunchCommand } from './punch-command';
const valid=()=>({commandId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',action:'CLOCK_IN',verificationId:'a'.repeat(64),
 expected:{revision:0,timeEntryId:null,timeEntryVersion:null,breakEntryId:null,breakEntryVersion:null}});
it('accepts the exact bounded command contract without coercion',()=>{
 expect(parsePunchCommand(valid())).toEqual(valid());
 const next={...valid(),action:'END_BREAK',expected:{revision:2,timeEntryId:'entry',timeEntryVersion:2,breakEntryId:'break',breakEntryVersion:1}};
 expect(parsePunchCommand(next)).toEqual(next);
});
it.each([null,[],{},'text',{...valid(),employeeId:'forged'},{...valid(),locationId:'forged'},
 {...valid(),clockInAt:'2020-01-01'}, {...valid(),pin:'0123'},{...valid(),action:'DELETE'},
 {...valid(),commandId:'not-a-uuid'},{...valid(),verificationId:'short'},
 {...valid(),expected:{...valid().expected,revision:-1}},
 {...valid(),expected:{...valid().expected,revision:'0'}},
 {...valid(),expected:{...valid().expected,revision:1.1}},
 {...valid(),expected:{...valid().expected,revision:2147483648}},
 {...valid(),expected:{...valid().expected,timeEntryId:'entry'}},
 {...valid(),expected:{...valid().expected,timeEntryVersion:1}},
 {...valid(),expected:{...valid().expected,breakEntryId:'break',breakEntryVersion:1}},
 {...valid(),expected:{...valid().expected,timeEntryId:'x'.repeat(129),timeEntryVersion:1}},
 {...valid(),expected:{...valid().expected,actorId:'forged'}},
])('rejects malformed, contradictory or extra authority without echoing data',input=>{
 expect(()=>parsePunchCommand(input)).toThrow('Check the clock action and reload its current state.');
});

it.each(['commandId','verificationId'] as const)('rejects a trailing newline in %s rather than normalizing its identity',field=>{
 const input={...valid(),[field]:valid()[field]+'\n'};
 expect(()=>parsePunchCommand(input)).toThrow('Check the clock action and reload its current state.');
});
