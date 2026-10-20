import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
/** Fictional owned-fixture lock only; never changes a row or application source. */
export async function withOwnedReadBarrier({table,reason},callback){
 assert.equal(table,'shifts','Only the reviewed Coverage shifts read may be held');
 const out=resolve(process.env.PREVIEW_OUT),source=resolve(process.env.VERIFY_SOURCE),sha=process.env.VERIFY_SHA;
 const run=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1),root=join(out,run),owned=(await readdir(root)).find(n=>n.startsWith('owned-next-'));
 const identity=JSON.parse(await readFile(join(root,owned,'ownership.json'),'utf8')),manifest=JSON.parse(await readFile(join(root,owned,'source-manifest.json'),'utf8'));
 assert.equal(identity.source,source);assert(identity.root.startsWith(out+'/'));assert.equal(manifest.checkpoint,sha);assert(!identity.closed);
 const suffix=/^nevora_exchange_test_audit_([a-f0-9]{12})$/.exec(identity.identity.name)?.[1];assert(suffix);
 const cluster=join(process.env.NEVORA_PREVIEW_TMP,'nevora-ui-preview-'+suffix.slice(0,10));assert((await readFile(join(cluster,'owner'),'utf8')).startsWith(suffix));
 const port=Number((await readFile(join(cluster,'data/postmaster.pid'),'utf8')).split('\n')[3]);assert(Number.isInteger(port)&&port>0);
 const req=createRequire(join(source,'package.json')),{Client}=req('pg'),client=new Client({host:'127.0.0.1',port,user:'nevora_audit',database:identity.identity.name});
 const events=[],stamp=(kind,extra={})=>events.push({kind,at:new Date().toISOString(),...extra});let connected=false,timer,releasePromise,locked=false,releasedBy;
 client.on('error',error=>stamp('connection-error',{message:error.message}));
 const release=async(by='manual')=>{if(releasePromise)return releasePromise;releasedBy=by;releasePromise=(async()=>{clearTimeout(timer);try{if(connected){await client.query('ROLLBACK');stamp('rollback-released',{by,table,wasLocked:locked});locked=false;}}finally{if(connected){await client.end();connected=false;stamp('connection-closed');}}})();return releasePromise;};
 try{
  await client.connect();connected=true;
  const actual=(await client.query("SELECT oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0];
  assert.equal(actual.oid,identity.identity.oid);assert.equal(actual.marker,identity.identity.marker);stamp('owned-identity-verified',{checkpoint:sha,databaseOid:actual.oid,table,reason});
  await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='1000ms'");await client.query("SET LOCAL idle_in_transaction_session_timeout='4500ms'");
  await client.query('LOCK TABLE public.shifts IN ACCESS EXCLUSIVE MODE');locked=true;stamp('lock-acquired',{table,maximumHoldMs:4000});
  timer=setTimeout(()=>{void release('bounded-timeout').catch(error=>stamp('release-error',{message:error.message}));},4000);timer.unref();
  const barrier={events,release:()=>release('manual'),get releasedBy(){return releasedBy;},get isHeld(){return locked;}};
  return await callback(barrier);
 }finally{await release('finally');}
}
