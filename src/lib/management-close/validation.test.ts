import {describe,expect,it} from 'vitest';
import {parseManagementCloseCommand} from './validation';

const command=()=>({operationId:'a13d6b36-2740-4e2e-8bca-cd11af44619f',timeEntryId:'recorded-entry-1',expectedSourceHash:'b'.repeat(32),closedAt:'2026-11-10T12:15:00-04:00',reason:'Worker cannot use the retired tablet.'});

describe('management-close command contract',()=>{
  it('accepts only a named recorded entry and normalizes the explicit offset instant',()=>{
    const value=parseManagementCloseCommand(command());
    expect(value).toEqual({...command(),closedAt:'2026-11-10T16:15:00Z'});
    expect(Object.keys(value).sort()).toEqual(['operationId','timeEntryId','expectedSourceHash','closedAt','reason'].sort());
  });
  it('retains microsecond precision instead of silently rounding a source command',()=>{
    expect(parseManagementCloseCommand({...command(),closedAt:'2026-11-10T16:15:00.123456Z'}).closedAt).toBe('2026-11-10T16:15:00.123456Z');
  });
  for(const [field,value] of [
    ['operationId','fresh'],['operationId',null],['timeEntryId',''],['timeEntryId',' other'],['timeEntryId','x'.repeat(201)],
    ['expectedSourceHash','z'.repeat(32)],['expectedSourceHash','b'.repeat(31)],['closedAt','2026-11-10T12:15'],
    ['closedAt','infinity'],['closedAt','2026-11-10T16:15:00.123456789Z'],['reason',''],['reason','  '],
    ['reason','Unconfirmed\nreason'],['reason','x'.repeat(501)],
  ] as const)it(`rejects malformed ${field} without accepting an implicit/default value`,()=>{
    expect(()=>parseManagementCloseCommand({...command(),[field]:value})).toThrow();
  });
  it('rejects missing fields, arrays and client-supplied actor/workspace claims',()=>{
    for(const key of Object.keys(command())){const value:Record<string,unknown>={...command()};delete value[key];expect(()=>parseManagementCloseCommand(value)).toThrow();}
    for(const value of [null,[],{...command(),actorId:'owner'},{...command(),workspaceId:'other'},{...command(),active:true}])expect(()=>parseManagementCloseCommand(value)).toThrow();
  });
});
