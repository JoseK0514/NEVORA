import {describe,expect,it} from 'vitest';
import {listTemplateShifts} from './schedule-templates';
import {managementProof} from '../../test/fixtures/management';
import type {SqlExecutor} from '../notifications/types';
// SQL transaction boundary fixture; real authorization/ownership integration is
// exercised in six-findings.integration.ts and legacy-safety.integration.ts.
function executor(rows:unknown[]):SqlExecutor{return {query:async<T>()=>[{id:'w',name:'Fictional',timeZone:'America/Puerto_Rico',active:true,createdAt:'2030-01-01',updatedAt:'2030-01-01'}] as T[],transaction:async statements=>statements.map(s=>s.text.includes('SELECT ts.id')?rows:[]) };}
describe('applying an active schedule template',()=>{
 it('rejects archived or missing templates before any shift is applied',async()=>{expect(await listTemplateShifts('archived-template',executor([]),managementProof('manager'))).toBeNull();});
 it('allows an active template with no shifts',async()=>{expect(await listTemplateShifts('empty-template',executor([{id:null}]),managementProof('manager'))).toEqual([]);});
 it('requires server-derived management proof for every selected read',async()=>{await expect(listTemplateShifts('empty-template',executor([{id:null}]))).rejects.toThrow('management_authorization');});
});
