const path=require('node:path'), root=process.cwd(), req=p=>require(path.resolve(root,p+'.ts'));
const {fictionalBusinessScope}=req('src/test/fixtures/rondo-business'),{normalizeBusinessVersion}=req('src/lib/owner-advisor/business/parse'),{selectBusinessScope,validateBusinessMap}=req('src/lib/owner-advisor/business/scope'),{calculateFinance}=req('src/lib/owner-advisor/business/finance'),{calculateSales}=req('src/lib/owner-advisor/business/sales'),{parseBusinessCsv}=req('src/lib/owner-advisor/business/csv');
function admit(entries,window,mode,at){
 const v=entries[0].version,accounts=[{accountRef:'operating',ownership:{kind:'COMPANY_SHARED'}}],catalog={revision:1,evidenceRevision:1,timeZone:'UTC',activeLocationIds:['loc'],sources:[{...v.input.source,sourceId:v.sourceId,active:true,deleted:false}],versions:entries.map(e=>e.version),maps:[]};
 const map=validateBusinessMap({expectedRevision:0,accounts,cells:entries.flatMap(e=>['CASH','OBLIGATIONS','RECEIVABLES'].map(metric=>({sourceId:v.sourceId,domain:'FINANCE',metric,currency:'USD',window:e.version.input.window,role:'PRIMARY',accountRefs:['operating'],locationIds:[]})))},catalog);
 return selectBusinessScope({window,temporalUse:mode,selection:{kind:'PRIMARY_PERIMETER'},locationScope:{kind:'ALL'},scenario:null},catalog,map,at);
}
const log=(k,v)=>console.log(k,JSON.stringify(v)),s=fictionalBusinessScope(),j=s.versions[0],jEnd=j.window.toAt,fEnd='2026-03-01T00:00:00.000Z',middle='2026-01-02T00:00:00.000Z';
j.version.input.records.push({...j.version.input.records[0],recordId:'old-close',at:middle});j.version.input=normalizeBusinessVersion(j.version.input);
for(const mode of ['CURRENT','HISTORICAL']){const a=admit([j],{...j.window,toAt:middle},mode,s.observedAt);log('Jan 2 as of Feb 1/'+mode,{state:a.state,qualified:a.scope.qualifiers,window:a.scope.query.window,observedAt:a.scope.observedAt,money:calculateFinance(a.scope,null).currencies[0]})}
const f=structuredClone(j); f.version.versionId='20000000-0000-4000-8000-000000000001';f.window=f.version.input.window={fromAt:jEnd,toAt:fEnd};f.version.input.sourceAsOf=fEnd;
function anchors(open,close,w,first,last){return [[first,w.fromAt,open],[last,w.toAt,close]].map(([recordId,at,amountMinor])=>({kind:'BALANCE',recordId,at,amountMinor,revision:'1',accountRef:'operating'}))}
j.version.input.records=anchors('10000','9000',j.window,'a','b');f.version.input.records=anchors('9000','10000',f.window,'b','c');
for(const e of [j,f]){e.version.input=normalizeBusinessVersion(e.version.input);const a=admit([e],e.window,'HISTORICAL',fEnd);log('individual',calculateFinance(a.scope,null).currencies[0]);}
const c=admit([j,f],{fromAt:j.window.fromAt,toAt:fEnd},'HISTORICAL',fEnd);
log('combined',calculateFinance(c.scope,{anchorRecordId:'c',throughDate:'2026-03-02',obligationRecordIds:[],receivableRecordIds:[]}));
const x={kind:'CASH',recordId:'settlement',revision:'1',accountRef:'operating',occurredAt:'2026-01-31T23:59:00.000Z',postedAt:'2026-02-01T00:01:00.000Z',state:'POSTED',deltaMinor:'123',reconciliationRef:null};
for(const e of [j,f])try{normalizeBusinessVersion({...e.version.input,records:[x]});log('accepted',e.window)}catch(err){log('cross-period cash',[e.window,err.message])}
log('fixture finance',calculateFinance(fictionalBusinessScope(),null).currencies[0]);log('fixture sales',calculateSales(fictionalBusinessScope('SALES')).currencies[0]);
const {records,...metadata}=fictionalBusinessScope('SALES').versions[0].version.input;
try{parseBusinessCsv('id\nsale\nsale',{amountUnit:'MINOR',columns:{recordId:'id'},constants:{kind:'CANCELLATION',revision:'1',orderRef:'order',locationId:'loc',at:metadata.window.fromAt}},metadata)}catch(e){log('duplicate CSV',e.message)}
