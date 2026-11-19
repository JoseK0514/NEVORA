import { expect, it } from '@rstest/core';
import { parseTool } from '../contracts';
import { parseDecisionMetrics, renderDecisionMetric } from '../decision-metrics';
import { fictionalBusinessScope } from '@/test/fixtures/rondo-business';
import { calculateFinance } from './finance';
import type { BusinessFinanceQuery } from './contracts';
import type { BusinessModelEvidence } from './model-contracts';
import { parseBusinessMetricReference, renderBusinessMetric, formatBusinessMinor, isBusinessCitationHref } from './metrics';
const id='10000000-0000-4000-8000-000000000001';
function fixture(){const s=fictionalBusinessScope();const query:BusinessFinanceQuery={...s.query,scenario:null};
 const model:BusinessModelEvidence={state:'ready',reason:null,domain:'FINANCE',completeScope:true,sourceSubtotal:false,window:query.window,selection:query.selection,locationScope:query.locationScope,temporalUse:query.temporalUse,scenario:null,observedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+15000).toISOString(),qualifiers:['OWNER_DECLARED_ACCOUNT_PERIMETER'],finance:calculateFinance(s,null),sales:null,timeZone:'UTC',queryHash:'a'.repeat(64),sourceDigest:'b'.repeat(64),citations:[{sourceId:id,versionId:id,digest:'c'.repeat(64),name:'Fictional bank',namespace:'fixture-FINANCE',currency:'USD',window:query.window,sourceAsOf:query.window.toAt,origin:'OWNER_IMPORT',timeZone:'UTC',href:`/api/owner/advisor/business/sources/${id}/versions/${id}`} ]};
 return {query,model,ref:{queryHash:model.queryHash,sourceDigest:model.sourceDigest,currency:'USD' as const,unit:'MINOR' as const,scale:2 as const}};}
it('parses only read-only strict finance/sales queries within the existing argument budget',()=>{
 const {query}=fixture();expect(parseTool('business_finance',JSON.stringify(query))).toEqual({name:'business_finance',args:query});
 const {scenario:_scenario,...sales}=query;expect(parseTool('business_sales',JSON.stringify(sales))).toEqual({name:'business_sales',args:sales});
 for(const patch of [{requestId:id},{workspaceId:'other'},{occurrence:1},{sql:'SELECT private'},{anchorAmountMinor:'100'}])expect(()=>parseTool('business_finance',JSON.stringify({...query,...patch}))).toThrow();
 expect(()=>parseTool('business_finance',' '.repeat(1025))).toThrow();expect(()=>parseTool('publish_source_version',JSON.stringify({}))).toThrow();
});
it('requires exact retrieved hashes, currency, minor units and scope, never caller amounts',()=>{
 const {query,model,ref}=fixture();const evidence={id:'E2',call:{name:'business_finance' as const,args:query},result:{businessEvidence:[model],data:{},partial:false,observedAt:model.observedAt,sources:[]}};
 const metric={evidenceId:'E2',metric:'business_reported_closing' as const,business:ref};
 expect(parseDecisionMetrics([metric])).toEqual([metric]);expect(renderDecisionMetric(metric,evidence,'en')).toContain('USD 1,435.00');
 expect(renderBusinessMetric('business_cash_inflow',ref,evidence,'en')).toContain('USD 500.00');expect(renderBusinessMetric('business_cash_outflow',ref,evidence,'en')).toContain('USD 65.00');
 expect(renderBusinessMetric('business_reported_closing',ref,evidence,'en')).toContain('2026-01-01T00:00:00.000Z');
 for(const patch of [{value:'900000'},{currency:'EUR'},{scale:3},{unit:'MAJOR'},{queryHash:'d'.repeat(64)},{sourceDigest:'d'.repeat(64)}]){
  const changed={...ref,...patch};const parsed=parseBusinessMetricReference(changed);expect(parsed===null || renderBusinessMetric('business_reported_closing',parsed,evidence,'en')===null).toBe(true);
 }
 const wrong={...model,locationScope:{kind:'SELECTED' as const,locationIds:['loc']}};expect(renderBusinessMetric('business_reported_closing',ref,{...evidence,result:{...evidence.result,businessEvidence:[wrong]}},'en')).toBeNull();
});
it('does not treat historical, unreconciled, shared or out-of-focus evidence as current cash clearance',()=>{
 const {query,model,ref}=fixture();const evidence={call:{name:'business_finance' as const,args:query},result:{businessEvidence:[model]}};
 expect(renderBusinessMetric('business_cash_balance',ref,evidence,'en')).toBeNull();
 expect(renderBusinessMetric('business_reported_closing',ref,evidence,'en',{kind:'coverage',date:'2026-01-15'})).toBeNull();
 const current={...query,temporalUse:'CURRENT' as const};const data={...model,temporalUse:'CURRENT' as const};data.finance=structuredClone(model.finance);data.finance!.currencies[0].reconciled=false;
 expect(renderBusinessMetric('business_cash_balance',ref,{call:{...evidence.call,args:current},result:{businessEvidence:[data]}},'en')).toBeNull();
 data.finance!.currencies[0].reconciled=true;data.completeScope=false;data.reason='SHARED_ACCOUNT';data.state='unavailable';expect(renderBusinessMetric('business_cash_balance',ref,{call:{...evidence.call,args:current},result:{businessEvidence:[data]}},'en')).toBeNull();
});
it('formats large and signed money without Number rounding and accepts only exact private source URLs',()=>{
 expect(formatBusinessMinor('999999999999999992','USD')).toBe('USD 9,999,999,999,999,999.92');expect(formatBusinessMinor('-1','EUR')).toBe('EUR -0.01');
 const href=`/api/owner/advisor/business/sources/${id}/versions/${id}`;expect(isBusinessCitationHref(href)).toBe(true);
 for(const value of [href+'?x=1',href+'#x','https://outside.invalid'+href,href.replace('/sources/','//sources/'),href.replace(id,'bad')])expect(isBusinessCitationHref(value)).toBe(false);
});
