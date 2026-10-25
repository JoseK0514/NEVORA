import {describe,expect,it} from 'vitest';
import {adpRunColumns,canonicalPayrollExport,decimalHours,mappedPayrollCsv,neutralProfile,parseExportProfile,type ExportProfile} from './model';
const ready=(regular:number,overtime=0,doubleTime=0,unpaid=0)=>({state:'ready' as const,paidNanoseconds:String((regular+overtime+doubleTime)*3_600_000_000_000),regularNanoseconds:String(regular*3_600_000_000_000),overtimeNanoseconds:String(overtime*3_600_000_000_000),doubleTimeNanoseconds:String(doubleTime*3_600_000_000_000),restDayNanoseconds:'0',unpaidBreakNanoseconds:String(unpaid*3_600_000_000_000),basis:{wageProfiles:[{id:'W1',revision:1}],dailyInterpretation:'UNRESOLVED',dailyInputDisposition:'INVARIANT_NO_FIRST_MINUTE_ENTRIES',workweekPolicySha256:'c'.repeat(64)}});
const model={version:1 as const,workspaceId:'W',timeZone:'America/Puerto_Rico',period:{startDate:'2026-09-21',endDate:'2026-09-27'},timeBasis:'RECORDED_ELAPSED_INCLUDING_BREAKS' as const,rows:[{employeeId:'E',employeeName:'José',revision:2,sourceHash:'a'.repeat(32),finalizationOperationId:'11111111-1111-4111-8111-111111111111',recordedNanoseconds:'28800000000000',breakNanoseconds:'1800000000000',entries:[]}]};
const classified={...model,version:2 as const,payableBasis:'NATIVE_PAYROLL_ENGINE' as const,rows:[{...model.rows[0],payable:ready(7.5,0,0,0.5)}]};
describe('D6 canonical model and verified configurable adapters',()=>{
 it('keeps exact canonical time in the record while the default file shows human hours',()=>{const csv=mappedPayrollCsv(model,neutralProfile());expect(model.rows[0].recordedNanoseconds).toBe('28800000000000');expect(csv).not.toContain('28800000000000');expect(csv).not.toContain('a'.repeat(32));expect(csv).toContain('"8.00"');expect(csv).toContain('"0.50"');expect(csv).toContain('José');expect(csv).toContain('Not classified');});
 it('requires current finalized cards rather than caller totals',()=>{expect(()=>canonicalPayrollExport('W','2026-10-01T00:00:00Z',model.period,[],['E'])).toThrow('Employee unavailable');});
 it('does not silently drop unmapped provider employees',()=>{expect(()=>mappedPayrollCsv(model,{...neutralProfile(),columns:[{header:'Employee',source:'providerEmployeeId'}]})).toThrow('identifier required');});
 it('does not silently round a fractional hour at import precision',()=>{expect(()=>decimalHours('60000000000',2,'REJECT_INEXACT')).toThrow('exactly');expect(decimalHours('60000000000',2,'HALF_UP')).toBe('0.02');expect(decimalHours('28800000000000',2,'REJECT_INEXACT')).toBe('8.00');});
 it('serializes only the documented ADP RUN v1 fields after configured identifiers',()=>{const p={...neutralProfile(),format:'ADP_RUN_GENERIC_V1' as const,dateFormat:'US' as const,hourDecimals:2,columns:adpRunColumns('FICTIONAL','W','TEST'),earningsCodes:{regular:'TESTREG',overtime:null,doubleTime:null},employeeMappings:[{employeeId:'E',providerEmployeeId:'001'}]};const csv=mappedPayrollCsv(classified,p);expect(csv.startsWith('##GENERIC## V1.0\r\n')).toBe(true);expect(csv).toContain('09/21/2026');expect(csv).toContain('"TESTREG","7.50"');expect(csv).not.toContain('8.00');expect(csv).not.toContain('"REG"');});
 it('refuses incomplete or altered RUN format and invented provider options',()=>{expect(()=>parseExportProfile({...neutralProfile(),format:'QUICKBOOKS'})).toThrow();expect(()=>parseExportProfile({...neutralProfile(),format:'ADP_RUN_GENERIC_V1',columns:adpRunColumns()})).toThrow();});
 it('refuses duplicate employee mapping and spreadsheet formulas in identifiers/constants',()=>{for(const employeeMappings of [[{employeeId:'E',providerEmployeeId:'=EXEC'}],[{employeeId:'E',providerEmployeeId:'001'},{employeeId:'OTHER',providerEmployeeId:'001'}]])expect(()=>parseExportProfile({...neutralProfile(),employeeMappings})).toThrow();});
 it('binds template verification and recorded time review to a profile',()=>{expect(()=>parseExportProfile({...neutralProfile(),reviewedTimeBasis:false})).toThrow();expect(()=>parseExportProfile({...neutralProfile(),verifiedRequirements:''})).toThrow();});
});

// The boundary must reject coercible values, rather than accepting their String(value).
const enumCases = [
 ['format', 'CUSTOM_CSV'], ['format', 'ADP_RUN_GENERIC_V1'],
 ['dateFormat', 'ISO'], ['dateFormat', 'US'],
 ['precision', 'REJECT_INEXACT'], ['precision', 'HALF_UP'],
] as const;
const malformed = (value:string): [string, unknown][] => [
 ['array', [value]], ['coercible object', {toString:()=>value}],
 ['boxed string', new String(value)], ['object', {}], ['number', 1],
 ['boolean', true], ['null', null], ['undefined', undefined],
];
describe('NVA-001 primitive export-profile enums',()=>{
 it.each(enumCases.flatMap(([field,value])=>malformed(value).map(([kind,input])=>({field,kind,input}))))(
  'rejects $field as $kind',({field,input})=>{
   expect(()=>parseExportProfile({...neutralProfile(),[field]:input})).toThrow();
  });
 it.each(malformed('recordedHours'))('rejects a mapping source as %s',(_kind,input)=>{
  expect(()=>parseExportProfile({...neutralProfile(),columns:[{header:'Hours',source:input}]})).toThrow();
 });
 it('retains primitive custom formats, both date formats and both precision choices',()=>{
  for(const dateFormat of ['ISO','US'] as const)for(const precision of ['REJECT_INEXACT','HALF_UP'] as const){
   const profile={...neutralProfile(),dateFormat,precision};
   expect(parseExportProfile(profile)).toEqual(profile);
  }
 });
 const fractional={...model,rows:[{...model.rows[0],recordedNanoseconds:'5400000000000'}]};
 const hours={...neutralProfile(),hourDecimals:0,columns:[{header:'Hours',source:'recordedHours' as const}]};
 it('keeps explicit zero-decimal precision for 1.5 hours',()=>{
  expect(()=>decimalHours('5400000000000',0,'REJECT_INEXACT')).toThrow('exactly');
  expect(decimalHours('5400000000000',0,'HALF_UP')).toBe('2');
  expect(()=>mappedPayrollCsv(fractional,{...hours,precision:'REJECT_INEXACT'})).toThrow('exactly');
  expect(mappedPayrollCsv(fractional,{...hours,precision:'HALF_UP'})).toBe('\uFEFF"Hours"\r\n"2"\r\n');
 });
 it.each(['REJECT_INEXACT','HALF_UP'])('rejects array precision %s at CSV use instead of truncating 1.5 hours',precision=>{
  const input={...hours,precision:[precision]} as unknown as ExportProfile;
  expect(()=>mappedPayrollCsv(fractional,input)).toThrow();
  expect(input.precision).toEqual([precision]);
 });
 it('cannot bypass ADP shape validation with an array format',()=>{
  expect(()=>mappedPayrollCsv(model,{...neutralProfile(),format:['ADP_RUN_GENERIC_V1']} as unknown as ExportProfile)).toThrow();
  expect(()=>parseExportProfile({...neutralProfile(),format:'ADP_RUN_GENERIC_V1'})).toThrow('columns or formats');
 });
 it('retains ADP employee identifier checks even with the correct documented shape',()=>{
  const profile={...neutralProfile(),format:'ADP_RUN_GENERIC_V1',dateFormat:'US',hourDecimals:2,
   columns:adpRunColumns('FICTIONAL','W','TEST'),earningsCodes:{regular:'TEST',overtime:'OT',doubleTime:null}};
  for(const providerEmployeeId of ['BAD-ID','1234567890123456']){
   expect(()=>parseExportProfile({...profile,employeeMappings:[{employeeId:'E',providerEmployeeId}]})).toThrow('codes');
  }
 });
});
