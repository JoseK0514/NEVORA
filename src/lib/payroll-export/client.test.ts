import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {verifyExportReply} from './client';
import {adpRunColumns,adpRunPaidColumns,mappedPayrollCsv,neutralPaidProfile,neutralProfile,type CanonicalPayrollExport} from './model';
import {projectPaidPayrollExport} from './paid-time';
import {stableExportJson} from './json';
const command={operationId:'11111111-1111-4111-8111-111111111111',profileId:null,profileRevision:0,startDate:'2026-09-21',endDate:'2026-09-27',cards:[{employeeId:'E',revision:2,sourceHash:'a'.repeat(32),finalizationOperationId:'22222222-2222-4222-8222-222222222222'}]};
const model:CanonicalPayrollExport={version:1,workspaceId:'W',timeZone:'America/Puerto_Rico',period:{startDate:command.startDate,endDate:command.endDate},timeBasis:'RECORDED_ELAPSED_INCLUDING_BREAKS',rows:[{...command.cards[0],employeeName:'José',recordedNanoseconds:'28800000000000',breakNanoseconds:'0',entries:[]}]};
const profile=neutralProfile(),csv=mappedPayrollCsv(model,profile),sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const receipt={operationId:command.operationId,model,profile,profileId:null,profileRevision:0,csv,csvSha256:sha(csv),canonicalSha256:sha(stableExportJson(model))};
it('verifies both file bytes and deterministic canonical model identity',async()=>{expect(await verifyExportReply({state:'generated',export:receipt},command)).toEqual(receipt);});
it.each([{csv:'altered'},{canonicalSha256:'f'.repeat(64)},{operationId:'other'},{model:{...model,period:{startDate:'2026-01-01',endDate:'2026-01-07'}}}])('refuses altered or cross-command export %j',async patch=>{await expect(verifyExportReply({state:'generated',export:{...receipt,...patch}},command)).rejects.toThrow();});
it('canonicalizes jsonb property ordering before fingerprint verification',()=>{expect(stableExportJson({b:2,a:1})).toBe(stableExportJson({a:1,b:2}));});
it('verifies historical RUN recorded-hours receipts with original bytes rather than applying a new paid mapping',async()=>{
 const profile={...neutralProfile(),format:'ADP_RUN_GENERIC_V1' as const,dateFormat:'US' as const,hourDecimals:2,columns:adpRunColumns('FICTIONAL','W','TEST','TEST').map(c=>c.header==='Pay Hours'?{...c,source:'recordedHours' as const}:c),employeeMappings:[{employeeId:'E',providerEmployeeId:'001'}]};
 const csv='##GENERIC## V1.0\r\n"IID","Pay Frequency","Pay Period Start Date","Pay Period End Date","Employee ID","Earnings Code","Pay Hours","Dollars","Separate Check","Worked In Dept","Rate Code"\r\n"FICTIONAL","W","09/21/2026","09/27/2026","001","TEST","8.00","","0","","TEST"\r\n';
 const input={...command,profileId:'33333333-3333-4333-8333-333333333333',profileRevision:1},historical={...receipt,profileId:input.profileId,profileRevision:1,profile,csv,csvSha256:sha(csv)};
 expect(await verifyExportReply({state:'generated',export:historical},input)).toEqual(historical);
 await expect(verifyExportReply({state:'generated',export:{...historical,profileId:null,profileRevision:0}},command)).rejects.toThrow();
});
it('binds a paid reply to explicit source-bound break decisions and rejects rehashed paid totals',async()=>{
 const paidTime={version:1 as const,breakTreatments:[]},input={...command,paidTime};
 const source={...model,rows:[{...model.rows[0],entries:[{id:'T',locationId:'L',locationName:'Fictional location',positionId:null,positionName:null,sourceKind:'RECORDED' as const,adjustmentId:null,recordedVersion:1,startAt:'2026-09-22T12:00:00Z',endAt:'2026-09-22T20:00:00Z',rawStartAt:'2026-09-22T12:00:00Z',rawEndAt:'2026-09-22T20:00:00Z',breaks:[],recordedNanoseconds:'28800000000000',breakNanoseconds:'0'}]}]};
 const paid=projectPaidPayrollExport(source,paidTime),profile=neutralPaidProfile(),csv=mappedPayrollCsv(paid,profile),result={...receipt,model:paid,profile,csv,csvSha256:sha(csv),canonicalSha256:sha(stableExportJson(paid))};
 expect(await verifyExportReply({state:'generated',export:result},input)).toEqual(result);
 const changed={...paid,rows:[{...paid.rows[0],paidNanoseconds:'0'}]},changedCsv=mappedPayrollCsv(changed,profile);
 await expect(verifyExportReply({state:'generated',export:{...result,model:changed,csv:changedCsv,csvSha256:sha(changedCsv),canonicalSha256:sha(stableExportJson(changed))}},input)).rejects.toThrow('paid-time');
 await expect(verifyExportReply({state:'generated',export:result},command)).rejects.toThrow('paid-time');
 const legacy={...neutralProfile(),format:'ADP_RUN_GENERIC_V1' as const,dateFormat:'US' as const,hourDecimals:2,columns:adpRunColumns('FICTIONAL','W','TEST','TEST'),employeeMappings:[{employeeId:'E',providerEmployeeId:'001'}]};
 for(const substitute of [legacy,neutralProfile()]){
  const csv=mappedPayrollCsv(paid,substitute,'HISTORICAL_RECEIPT'),replaced={...result,profile:substitute,csv,csvSha256:sha(csv)};
  await expect(verifyExportReply({state:'generated',export:replaced},input)).rejects.toThrow();
 }
 const savedInput={...input,profileId:'33333333-3333-4333-8333-333333333333',profileRevision:1},legacyCsv=mappedPayrollCsv(paid,legacy,'HISTORICAL_RECEIPT');
 await expect(verifyExportReply({state:'generated',export:{...result,profileId:savedInput.profileId,profileRevision:1,profile:legacy,csv:legacyCsv,csvSha256:sha(legacyCsv)}},savedInput)).rejects.toThrow();
 const reviewed={...legacy,columns:adpRunPaidColumns('FICTIONAL','W','TEST','TEST')},reviewedCsv=mappedPayrollCsv(paid,reviewed),reviewedReceipt={...result,profileId:savedInput.profileId,profileRevision:1,profile:reviewed,csv:reviewedCsv,csvSha256:sha(reviewedCsv)};
 expect(await verifyExportReply({state:'generated',export:reviewedReceipt},savedInput)).toEqual(reviewedReceipt);
});
