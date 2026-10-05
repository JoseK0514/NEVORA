import { expect, it } from 'vitest';
import { validateBreakType, breakProgress } from './break-types';
const valid={name:'Rest break',category:'REST',targetMinutes:15,active:true};
it('normalizes an operational name and accepts an optional target',()=>{
 expect(validateBreakType({...valid,name:'  Cafe\u0301 break  '})).toEqual({...valid,name:'Café break'});
 expect(validateBreakType({...valid,targetMinutes:null})).toEqual({...valid,targetMinutes:null});
});
it.each([null,[],{}, {...valid,name:''},{...valid,name:'x'.repeat(81)},{...valid,name:'bad\nname'},
 {...valid,category:'PAID'}, {...valid,category:['REST']},{...valid,targetMinutes:0},{...valid,targetMinutes:-1},
 {...valid,targetMinutes:1441},{...valid,targetMinutes:1.5},{...valid,targetMinutes:'15'},
 {...valid,active:'true'},{...valid,employeeId:'forged'},{...valid,autoEnd:true}])('rejects invalid or invented policy fields',value=>{
 expect(()=>validateBreakType(value)).toThrow('Check the break name, classification and reference duration.');
});
it('accepts the stated limits without silently converting them',()=>{
 expect(validateBreakType({...valid,name:'x'.repeat(80),category:'OTHER',targetMinutes:1440,active:false})).toMatchObject({targetMinutes:1440,active:false});
});
it('the reference countdown never changes actual elapsed time or ends a break',()=>{
 expect(breakProgress('2026-10-05T12:00:00Z',15,Date.parse('2026-10-05T12:17:10Z'))).toEqual({elapsedSeconds:1030,remainingSeconds:0,overTarget:true});
 expect(breakProgress('2026-10-05T12:00:00Z',null,Date.parse('2026-10-05T12:17:10Z'))).toEqual({elapsedSeconds:1030,remainingSeconds:null,overTarget:false});
 expect(breakProgress('2026-10-05T12:00:00Z',15,Date.parse('2026-10-05T12:01:00Z'))).toEqual({elapsedSeconds:60,remainingSeconds:840,overTarget:false});
});
it.each(['invalid', ''])('refuses an invalid recorded start',value=>{expect(()=>breakProgress(value,15,Date.now())).toThrow();});
