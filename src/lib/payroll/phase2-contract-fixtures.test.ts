import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {parseImport,parseRunCommand,totals,PayrollError} from './model';
import {failure} from './http';
import {parseExportCommand} from '../payroll-export/command';
import {verifyExportReply} from '../payroll-export/client';
import {parseCommerceStatus} from '../commerce/status';
import {parseExportProfile} from '../payroll-export/model';
import {planPaidExportBatches} from '../payroll-export/batches';

const fixtures=JSON.parse(readFileSync('docs/handoffs/2026-11-16-backend-phase2-finance-fixtures.json','utf8'));
it('Claude CSV/JSON/correction examples satisfy real parsers and exact cents with every roster member',()=>{
 for(const name of ['json','csv','correction']){
  const c=parseRunCommand(fixtures.imports[name]);expect(c.action).toBe(name==='correction'?'CORRECT':'IMPORT');
  if(c.action!=='IMPORT'&&c.action!=='CORRECT')throw Error('Wrong fixture command');
  const amounts=parseImport(c.amounts,fixtures.imports.population);
  expect(totals(amounts)).toEqual({grossMinor:name==='correction'?'100002':'100001',deductionsMinor:'12340',employerContributionsMinor:'7000',netMinor:name==='correction'?'87662':'87661',employeeCount:2});
 }
});
it('Claude invalid-row and conflict examples match actual public error shapes',async()=>{
 let error:unknown;try{parseRunCommand(fixtures.imports.invalid);}catch(e){error=e;}
 expect(error).toBeInstanceOf(PayrollError);expect(await failure(error).json()).toEqual(fixtures.imports.invalidResponse);
 expect(await failure(new PayrollError('OPERATION_CONFLICT',409)).json()).toEqual(fixtures.imports.conflictResponse);
 expect(fixtures.imports.recovery.retryBody).toBe(fixtures.imports.recovery.originalBody);
 expect(parseRunCommand(JSON.parse(fixtures.imports.recovery.originalBody))).toEqual(parseRunCommand(fixtures.imports.csv));
 expect(fixtures.imports.recovery.changedBody).not.toBe(fixtures.imports.recovery.originalBody);
});
it('Claude paid-export receipt reconstructs exact CSV, paid/unpaid time and both hashes',async()=>{
 const c=parseExportCommand(fixtures.exports.command);
 const result=await verifyExportReply(fixtures.exports.generated,c);
 expect(result.model.rows[0]).toMatchObject({recordedNanoseconds:'30600000000000',paidNanoseconds:'28800000000000',unpaidBreakNanoseconds:'1800000000000',paidRestNanoseconds:'900000000000'});
 await expect(verifyExportReply(fixtures.exports.generated,parseExportCommand(fixtures.exports.changedRetry))).rejects.toThrow();
});
it('Claude billing presentations use the existing authorized state contract without granting pending upgrades',()=>{
 for(const value of Object.values(fixtures.billing.companyStatus))expect(parseCommerceStatus(value)).toEqual(value);
 expect(fixtures.billing.companyStatus.pending_upgrade.plan).toBe('small');
 expect(fixtures.billing.companyStatus.pending_downgrade.plan).toBe('team');
 expect(fixtures.billing.downgrade.response.effective).toBe('period_end');
});
it('Claude saved-profile and batching examples reproduce the actual versioned contracts',async()=>{
 expect(parseExportProfile(fixtures.profiles.saveRequest.profile)).toEqual(fixtures.profiles.saveResponse.profile.profile);
 expect(await planPaidExportBatches(fixtures.batching.input)).toEqual(fixtures.batching.plan);
});
