// Adversarial cancellation of the owned Next fixture (item G). A successful start/teardown does not certify these:
// abort once the Next process exists, and abort when teardown must be refused because ownership changed.
import {it,expect} from 'vitest';
import {randomBytes} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Client} from 'pg';
import type {ChildProcess} from 'node:child_process';
import {createOwnedNextApp} from './owned-next-app';

const alive=(pid:number)=>{try{process.kill(pid,0);return true;}catch(error){return (error as NodeJS.ErrnoException).code!=='ESRCH';}};
async function databaseExists(name:string){
 const target=new URL(process.env.FUEL_TEST_DATABASE_URL!);target.pathname='/postgres';
 const admin=new Client({connectionString:target.href,connectionTimeoutMillis:3000});await admin.connect();
 try{return (await admin.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=$1",[name])).rows[0]?.marker as string|undefined;}finally{await admin.end();}
}
/** Test-owned cleanup after a refused teardown: exact recorded group, marker-checked database. */
async function releaseRefused(child:ChildProcess|undefined,name:string){
 if(child?.pid&&alive(child.pid)){try{process.kill(-child.pid,'SIGKILL');}catch{/* group already gone */}await new Promise(resolve=>setTimeout(resolve,500));}
 const marker=await databaseExists(name);if(!marker)return;
 if(!marker.startsWith('fuel-phase3-disposable:'))throw Error('Refusing to drop an unmarked database');
 const target=new URL(process.env.FUEL_TEST_DATABASE_URL!);target.pathname='/postgres';
 const admin=new Client({connectionString:target.href,connectionTimeoutMillis:3000});await admin.connect();
 try{await admin.query(`DROP DATABASE "${name.replace(/"/g,'')}" WITH (FORCE)`);}finally{await admin.end();}
}

it('aborting after the Next process starts rejects and leaves no process group or database',async()=>{
 const evidence=await mkdtemp(join(tmpdir(),'nevora-cancel-'));const controller=new AbortController();
 let child:ChildProcess|undefined,name='';
 try{
  await expect(createOwnedNextApp(evidence,{signal:controller.signal,processOwnerId:randomBytes(16).toString('hex'),
   initializeDatabase:async({identity})=>{name=identity.name;},
   onProcessStarted:async started=>{child=started;controller.abort(new Error('fictional forced abort after start'));}})).rejects.toThrow();
  expect(child?.pid).toBeGreaterThan(0);expect(name).toMatch(/^nevora_/);
  await expect.poll(()=>alive(child!.pid!),{timeout:15000}).toBe(false);
  expect(()=>process.kill(-child!.pid!,0)).toThrow();
  expect(await databaseExists(name)).toBeUndefined();
 }finally{await releaseRefused(child,name).catch(()=>{});await rm(evidence,{recursive:true,force:true});}
},300000);

it('a teardown refused because ownership changed reports both errors and kills nothing it cannot prove',async()=>{
 const evidence=await mkdtemp(join(tmpdir(),'nevora-cancel-'));const controller=new AbortController();
 let child:ChildProcess|undefined,name='';
 try{
  const failure=await createOwnedNextApp(evidence,{signal:controller.signal,processOwnerId:randomBytes(16).toString('hex'),
   initializeDatabase:async({identity})=>{name=identity.name;},
   onProcessStarted:async(started,{root})=>{
    child=started;const manifest=join(root,'ownership.json'),value=JSON.parse(await readFile(manifest,'utf8'));
    await writeFile(manifest,JSON.stringify({...value,ownerId:'f'.repeat(32)}));
    controller.abort(new Error('fictional forced abort after ownership change'));
   }}).then(()=>undefined,error=>error as Error);
  expect(failure).toBeInstanceOf(AggregateError);expect(failure?.message).toBe('Owned application setup and closure failed');
  expect(String((failure as AggregateError).errors.map(String))).toContain('Owned application identity changed; refusing teardown');
  // Refusal is the safe outcome: nothing unprovable was signalled or dropped.
  expect(alive(child!.pid!)).toBe(true);expect(await databaseExists(name)).toMatch(/^fuel-phase3-disposable:/);
 }finally{await releaseRefused(child,name);await rm(evidence,{recursive:true,force:true});expect(child?.pid?alive(child.pid):false).toBe(false);}
},300000);
