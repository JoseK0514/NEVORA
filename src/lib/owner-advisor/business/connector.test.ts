import { expect, it, vi } from 'vitest';
import { fictionalBusinessInput, businessJanuary } from '@/test/fixtures/rondo-business';
import { collectReadonlyBusinessSnapshot, registerReadonlyBusinessConnector } from './connector.server';
const input = fictionalBusinessInput();
const page=(patch:Record<string,unknown>={})=>({pageId:'page-1',snapshotId:'snapshot-1',revision:'revision-1',sourceAsOf:businessJanuary.toAt,final:true,records:input.records,...patch});
function registered(pages:unknown[], patch:Record<string,unknown>={}) {
  const readPages=vi.fn(async function*(){for(const p of pages)yield p;});
  const handle=registerReadonlyBusinessConnector({id:'fictional-bank',workspaceId:'workspace-fuel',environment:'development',source:input.source,accountRefs:['operating'],locationIds:[],secretReference:{kind:'REFERENCE',store:'keychain',name:'fictional-readonly-ref',environment:'development'},adapter:{mode:'READ_ONLY_SNAPSHOT',readPages},...patch});
  return {handle,readPages};
}
const collect=(handle:ReturnType<typeof registered>['handle'],signal=new AbortController().signal)=>collectReadonlyBusinessSnapshot(handle,businessJanuary,'2026-02-01T00:00:01.000Z',signal);
it('collects every page of one immutable snapshot without reading a credential value or inferring provider authentication',async()=>{
  const {handle,readPages}=registered([page({final:false,records:input.records.slice(0,4)}),page({pageId:'page-2',records:input.records.slice(4)})]);
  const got=await collect(handle);expect(got.input.records).toHaveLength(9);expect(got.input.completeness).toBe('COMPLETE');expect(got.provenance).toMatchObject({connectorId:'fictional-bank',snapshotId:'snapshot-1',revision:'revision-1'});
  expect(readPages.mock.calls[0]).toEqual([expect.objectContaining({workspaceId:'workspace-fuel',accountRefs:['operating'],window:businessJanuary}),{kind:'REFERENCE',store:'keychain',name:'fictional-readonly-ref',environment:'development'},expect.any(AbortSignal)]);
  expect(JSON.stringify(handle)).not.toContain('fictional-readonly-ref');
});
it.each([
  {pages:[page({final:false})],code:'INCOMPLETE_SNAPSHOT'},
  {pages:[page({final:false}),page({pageId:'page-2',revision:'changed'})],code:'SNAPSHOT_CHANGED'},
  {pages:[page({final:false}),page({pageId:'page-2',snapshotId:'changed'})],code:'SNAPSHOT_CHANGED'},
  {pages:[page({final:false}),page({pageId:'page-2',sourceAsOf:'2026-02-01T00:00:00.001Z'})],code:'SNAPSHOT_CHANGED'},
  {pages:[page(),page({pageId:'page-2'})],code:'AFTER_FINAL_PAGE'},
  {pages:[page({final:false}),page()],code:'DUPLICATE_PAGE'},
])('rejects pagination failure $code without returning a publishable snapshot',async ({pages,code})=>{await expect(collect(registered(pages).handle)).rejects.toThrow('CONNECTOR_'+code);});
it('rejects duplicate records across distinct pages and rows outside the registered account scope',async()=>{
  await expect(collect(registered([page({final:false,records:[input.records[0]]}),page({pageId:'page-2',records:[input.records[0]]})]).handle)).rejects.toThrow(/CONNECTOR/);
  await expect(collect(registered([page()],{accountRefs:['different-account']}).handle)).rejects.toThrow(/SCOPE/);
});
it('refuses forged handles, arbitrary network configuration, production scope and credential values',async()=>{
  const r=registered([page()]);await expect(collect(JSON.parse(JSON.stringify(r.handle)))).rejects.toThrow(/UNREGISTERED/);
  for(const patch of [{endpoint:'https://outside.invalid'},{environment:'production'},{secretReference:{value:'not-a-reference'}},{adapter:{mode:'READ_WRITE',readPages:async function*(){yield page();}}}])expect(()=>registered([page()],patch)).toThrow(/CONNECTOR/);
});
it('bounds rows and actual UTF-8 payload without a sample and aborts an open async page promptly',async()=>{
  await expect(collect(registered([page({records:Array.from({length:1001},(_,i)=>({...input.records[0],recordId:`r${i}`}))})]).handle)).rejects.toThrow(/LIMIT/);
  const abort=new AbortController();const r=registered([],{adapter:{mode:'READ_ONLY_SNAPSHOT',readPages:()=>({[Symbol.asyncIterator](){return {next:()=>new Promise(()=>{})};}})}});
  const pending=collect(r.handle,abort.signal);abort.abort();await expect(pending).rejects.toThrow();
});
it('sanitizes upstream errors without returning provider diagnostics or secret references',async()=>{
  const r=registered([],{adapter:{mode:'READ_ONLY_SNAPSHOT',readPages:async function*(){throw Error('private provider response and fictional credential');}}});await expect(collect(r.handle)).rejects.toThrow(/^CONNECTOR_UNAVAILABLE$/);
});
it('keeps cleanup errors private and does not overwrite the original scope failure',async()=>{
  const r=registered([],{accountRefs:['other'],adapter:{mode:'READ_ONLY_SNAPSHOT',readPages:()=>({[Symbol.asyncIterator](){return {next:async()=>({done:false,value:page()}),return(){throw Error('private cleanup response');}};}})}});
  await expect(collect(r.handle)).rejects.toThrow(/^CONNECTOR_SCOPE$/);
});
it('enforces the aggregate decoded byte cap across individually valid pages and bounds empty pagination',async()=>{
  const account='a'.repeat(128);const rows=Array.from({length:1000},(_,i)=>({kind:'CASH',recordId:'r'+'x'.repeat(120)+String(i).padStart(4,'0'),revision:'v'.repeat(128),accountRef:account,occurredAt:businessJanuary.fromAt,postedAt:businessJanuary.fromAt,state:'POSTED',deltaMinor:'999999999999999999',reconciliationRef:'c'.repeat(128)}));
  await expect(collect(registered([page({final:false,records:rows.slice(0,500)}),page({pageId:'page-2',records:rows.slice(500)})],{accountRefs:[account]}).handle)).rejects.toThrow(/INPUT_LIMIT/);
  const pages=Array.from({length:1000},(_,i)=>page({pageId:`p${i}`,records:[],final:i===999}));expect((await collect(registered(pages).handle)).input.records).toEqual([]);
  pages[999].final=false;pages.push(page({pageId:'overflow',records:[]}));await expect(collect(registered(pages).handle)).rejects.toThrow(/INPUT_LIMIT/);
});
