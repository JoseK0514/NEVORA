import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Client,type QueryResult} from 'pg';
import {expect,it,vi} from 'vitest';
import {createDisposableNotificationDatabase,CURRENT_MIGRATIONS} from './local-postgres';
import type {MigrationFailureReceipt} from './owned-migration-diagnostics';

it('retains an actual helper bootstrap lock failure and closes both clients before owned teardown',async()=>{
  const file=CURRENT_MIGRATIONS[1],migration=await readFile(`db/migrations/${file}`,'utf8');
  const known=new Map(await Promise.all(CURRENT_MIGRATIONS.map(async name=>[await readFile(`db/migrations/${name}`,'utf8'),name] as const))),executed:string[]=[];
  const target=new URL(process.env.FUEL_TEST_DATABASE_URL!),adminTarget=new URL(target);adminTarget.pathname='/postgres';
  // Instrument only the existing pg transport boundary. The helper still owns
  // creation, exact migration execution, observation, publication and disposal.
  const raw=Client.prototype.query as (this:Client,text:string,values?:unknown[])=>Promise<QueryResult>;
  const rawEnd=Client.prototype.end as (this:Client)=>Promise<void>;
  const closed=new Set<Client>(),lines:string[]=[];
  let injected=false,bodyStarted=false,dropped=false,bootstrap:Client|undefined,observer:Client|undefined,original:unknown,caught:unknown;
  const endSpy=vi.spyOn(Client.prototype,'end').mockImplementation(async function(this:Client){await rawEnd.call(this);closed.add(this);});
  const intercept=async function(this:Client,text:string,values?:unknown[]):Promise<QueryResult>{
    const migrationName=known.get(text);if(migrationName)executed.push(migrationName);
    if(text.startsWith('SELECT state,wait_event_type,wait_event,cardinality'))observer=this;
    if(text.startsWith('DROP DATABASE')){
      expect(bootstrap&&closed.has(bootstrap)).toBe(true);expect(observer&&closed.has(observer)).toBe(true);dropped=true;
    }
    if(text!==migration||injected)return raw.call(this,text,values);
    injected=true;bootstrap=this;
    const blocker=new Client({connectionString:target.href,connectionTimeoutMillis:3000});
    try{
      await blocker.connect();await raw.call(blocker,'BEGIN');await raw.call(blocker,'LOCK TABLE locations IN ACCESS EXCLUSIVE MODE');
      try{return await raw.call(this,text,values);}catch(error){original=error;throw error;}
    }finally{try{await raw.call(blocker,'ROLLBACK');}finally{await blocker.end();}}
  };
  const querySpy=vi.spyOn(Client.prototype,'query').mockImplementation(intercept as typeof Client.prototype.query);
  const writeSpy=vi.spyOn(process.stderr,'write').mockImplementation((chunk)=>{lines.push(String(chunk));return true;});
  try{
    try{const database=await createDisposableNotificationDatabase();bodyStarted=true;await database.dispose();}catch(error){caught=error;}
    expect(caught).toBe(original);expect(caught).toMatchObject({code:'57014'});expect(bodyStarted).toBe(false);expect(dropped).toBe(true);
    expect(executed).toEqual(CURRENT_MIGRATIONS.slice(0,2));
    const diagnostics=lines.filter(line=>line.startsWith('[OWNED_MIGRATION_FAILURE] '));expect(diagnostics).toHaveLength(1);
    const receipt=JSON.parse(diagnostics[0].slice('[OWNED_MIGRATION_FAILURE] '.length)) as MigrationFailureReceipt;
    expect(receipt).toMatchObject({file,index:2,total:CURRENT_MIGRATIONS.length,sha256:createHash('sha256').update(migration).digest('hex'),sqlstate:'57014',statementTimeout:'5s',observerFailed:false});
    expect(receipt.elapsedMs).toBeGreaterThanOrEqual(4900);expect(receipt.samples.length).toBeGreaterThan(0);expect(receipt.samples.length).toBeLessThanOrEqual(4);
    expect(receipt.samples.some(sample=>sample.waitEventType==='Lock'&&sample.waitEvent==='relation'&&sample.blockers===1)).toBe(true);
    for(const privateInput of [target.href,migration,target.username])expect(JSON.stringify(receipt)).not.toContain(privateInput);
  }finally{writeSpy.mockRestore();querySpy.mockRestore();endSpy.mockRestore();}
  const admin=new Client({connectionString:adminTarget.href,connectionTimeoutMillis:3000});
  try{await admin.connect();expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[target.pathname.slice(1)])).rowCount).toBe(0);}finally{await admin.end();}
},15000);
