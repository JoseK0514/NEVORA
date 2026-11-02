import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PILOT, PILOT_ENDPOINT, initializePilot, guardedFetch } from './owner-advisor-partner-pilot.mts';

test('partner permits omitted or high effort only, reserves failures and caps lifetime at forty', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'partner-guard-')));
  const p = {...PILOT, credential: 'fictional-only', ledgerPath: join(root,'private','ledger.json')};
  try {
    initializePilot(p);
    let calls = 0;
    const transport = guardedFetch(p, async () => { calls++; return Response.json({}); });
    const request = (extra: Record<string,unknown> = {}) => transport(PILOT_ENDPOINT, {method:'POST',redirect:'error',headers:{authorization:`Bearer ${p.credential}`,'content-type':'application/json'},body:JSON.stringify({model:PILOT.model,store:false,include:['reasoning.encrypted_content'],instructions:'Fictional evaluation',input:[{role:'user',content:'hello'}],tools:[],parallel_tool_calls:false,max_output_tokens:4096,...extra})});
    await assert.doesNotReject(request({reasoning:{effort:'high'}}));
    await request();
    for(const reasoning of [{effort:'low'},{effort:'medium'},{effort:'high',summary:'auto'},null,'high',{}]) await assert.rejects(request({reasoning}));
    assert.equal(calls,2);
    for(let i=2;i<40;i++) await request({reasoning:{effort:'high'}});
    await assert.rejects(request());
    assert.equal(calls,40);
    assert.equal(JSON.parse(readFileSync(p.ledgerPath,'utf8')).attempts,40);
    assert.throws(()=>initializePilot(p));
    assert.throws(()=>guardedFetch({...p,pilotId:'owner-advisor-resilience-20261101'},globalThis.fetch));
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('startup denies absent approval, used/altered ledgers and reused evidence before credentials', async () => {
  const { admitPartnerPilot, PARTNER_APPROVAL } = await import('./owner-advisor-partner-pilot.mts');
  const { writeFileSync } = await import('node:fs');
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'partner-startup-')));
  const p = {...PILOT,credential:'fictional-only',ledgerPath:join(root,'budget','ledger.json')};
  let credentials = 0, claims = 0;
  const options = {approval:PARTNER_APPROVAL,ledgerPath:p.ledgerPath,evidencePath:join(root,'evidence'),sourceHead:'a'.repeat(40),claimEvidence:async()=>{claims++;},readCredential:async()=>{credentials++;return 'fictional-only';}};
  try {
    initializePilot(p);
    await assert.rejects(admitPartnerPilot({...options,approval:undefined}));
    assert.equal(credentials,0); assert.equal(claims,0);
    await assert.rejects(admitPartnerPilot({...options,claimEvidence:async()=>{throw Error('occupied evidence');}}));
    assert.equal(credentials,0);
    const admitted=await admitPartnerPilot(options); assert.equal(admitted.pilotId,'owner-advisor-partner-20261101'); assert.equal(credentials,1);
    const state=JSON.parse(readFileSync(p.ledgerPath,'utf8'));
    writeFileSync(p.ledgerPath,JSON.stringify({...state,attempts:40}));
    await assert.rejects(admitPartnerPilot(options)); assert.equal(credentials,1);
    writeFileSync(p.ledgerPath,JSON.stringify({...state,attempts:1}));
    await assert.rejects(admitPartnerPilot(options)); assert.equal(credentials,1);
    writeFileSync(p.ledgerPath,JSON.stringify({...state,pilotId:'owner-advisor-resilience-20261101'}));
    await assert.rejects(admitPartnerPilot(options)); assert.equal(credentials,1);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('catalog rejects unknown/coerced rates and missing model before inference', async()=>{
 const { validatePartnerCatalog } = await import('./owner-advisor-partner-pilot.mts');
 const prices={prompt:0.000002,completion:0.00001,input_cache_write:0.0000025,input_cache_read:0};
 assert.doesNotThrow(()=>validatePartnerCatalog({data:[{id:PILOT.model,pricing:prices}]}));
 for(const value of [null,'',true,false,' ',undefined,-1,'NaN',Infinity,0.000003]) assert.throws(()=>validatePartnerCatalog({data:[{id:PILOT.model,pricing:{...prices,prompt:value}}]}));
 assert.throws(()=>validatePartnerCatalog({data:[]}));
});

test('frozen legacy adapters preserve reasoning-content differences and both reject effort',async()=>{
 const original=await import('./owner-advisor-pilot.mts'),resilience=await import('./owner-advisor-resilience-pilot.mts');
 for(const [adapter,allowsContent] of [[original,false],[resilience,true]] as const){
  const root=realpathSync(mkdtempSync(join(tmpdir(),'legacy-policy-'))),p={...adapter.PILOT,credential:'fictional',ledgerPath:join(root,'budget','ledger.json')};
  try{
   adapter.initializePilot(p);let calls=0;const transport=adapter.guardedFetch(p,async()=>{calls++;return Response.json({});});
   const request=(extra:Record<string,unknown>)=>transport(adapter.PILOT_ENDPOINT,{method:'POST',redirect:'error',headers:{authorization:'Bearer fictional','content-type':'application/json'},body:JSON.stringify({model:adapter.PILOT.model,store:false,include:['reasoning.encrypted_content'],instructions:'Fictional',input:[],tools:[],parallel_tool_calls:false,max_output_tokens:4096,...extra})});
   await assert.rejects(request({reasoning:{effort:'high'}}));
   const content=request({input:[{type:'reasoning',id:'r',summary:[],content:[]}]});
   if(allowsContent)await assert.doesNotReject(content);else await assert.rejects(content);
   assert.equal(calls,allowsContent?1:0);
  }finally{rmSync(root,{recursive:true,force:true});}
 }
});
