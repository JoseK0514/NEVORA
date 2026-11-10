import {expect,it} from 'vitest';
import {projectExchangeCounts,parseExchangeCounts} from './exchange-counts';
import type {ExchangeRecord} from './data/exchanges';
const row=(over:Partial<ExchangeRecord>={})=>({kind:'COVERAGE',status:'OPEN',requestedByEmployeeId:'peer',targetEmployeeId:null,actionable:true,requestRevision:1,sourceShift:{locationId:'a'},targetShift:null,...over}) as ExchangeRecord;
it('counts only visible open cover and addressed swaps within both location scopes',()=>{
 expect(projectExchangeCounts([row(),row({requestedByEmployeeId:'me'}),row({actionable:false}),row({sourceShift:{locationId:'b'} as ExchangeRecord['sourceShift']})],[row({kind:'SWAP',status:'EMPLOYEE_PENDING',targetEmployeeId:'me'}),row({kind:'SWAP',status:'EMPLOYEE_PENDING',targetEmployeeId:'other'}),row({kind:'SWAP',status:'EMPLOYEE_PENDING',targetEmployeeId:'me',targetShift:{locationId:'b'} as ExchangeRecord['sourceShift']})],'me',['a'])).toEqual({open:1,forYou:1});
});
it('failed sources remain unknown independently',()=>{expect(projectExchangeCounts(null,[],'me',['a'])).toEqual({open:null,forYou:0});expect(projectExchangeCounts([],null,'me',['a'])).toEqual({open:0,forYou:null});});
it('rejects invalid or private count payloads',()=>{for(const v of [{open:-1,forYou:0},{open:0.5,forYou:1},{open:0,forYou:0,employeeId:'private'}])expect(()=>parseExchangeCounts(v)).toThrow();expect(parseExchangeCounts({open:null,forYou:2})).toEqual({open:null,forYou:2});});
