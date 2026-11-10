import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Client} from 'pg';
import {afterEach,expect,it,vi} from 'vitest';
import {createDisposableFoundationDatabase,CURRENT_MIGRATIONS} from './local-postgres';
import {ownedMigrationObserver,traceOwnedMigration,type MigrationFailureReceipt} from './owned-migration-diagnostics';
afterEach(()=>vi.unstubAllEnvs());

it('records a real owned migration lock timeout before teardown without executing later work',async()=>{
  const target=new URL(process.env.FUEL_TEST_DATABASE_URL!);
  // Only select a new name; createOwnedDatabase still enforces loopback,
  // absence, marker/OID ownership and explicit destructive-teardown permission.
  target.pathname='/nevora_foundation_test_migration_diagnostics';
  vi.stubEnv('FUEL_TEST_DATABASE_URL',target.href);
  const database=await createDisposableFoundationDatabase({mode:'empty'});
  const bootstrap=new Client({connectionString:database.connectionString,statement_timeout:5000,connectionTimeoutMillis:3000});
  const blocker=new Client({connectionString:database.connectionString,connectionTimeoutMillis:3000});
  let observer:ReturnType<typeof ownedMigrationObserver>|undefined,bodyStarted=false;
  const receipts:MigrationFailureReceipt[]=[];
  try{
    await bootstrap.connect();await blocker.connect();
    await bootstrap.query(await readFile(`db/migrations/${CURRENT_MIGRATIONS[0]}`,'utf8'),[]);
    const [{pid,statement_timeout:statementTimeout}]=(await bootstrap.query("SELECT pg_backend_pid() AS pid,current_setting('statement_timeout') AS statement_timeout")).rows;
    expect(statementTimeout).toBe('5s');
    observer=ownedMigrationObserver(database.connectionString,pid);
    await blocker.query('BEGIN');await blocker.query('LOCK TABLE locations IN ACCESS EXCLUSIVE MODE');
    const file=CURRENT_MIGRATIONS[1],sql=await readFile(`db/migrations/${file}`,'utf8');
    let original:unknown,caught:unknown;
    try{
      await traceOwnedMigration({file,index:2,total:CURRENT_MIGRATIONS.length,sql,pid,statementTimeout,sample:()=>observer!.sample(),publish:r=>receipts.push(r),execute:async()=>{
        try{return await bootstrap.query(sql,[]);}catch(error){original=error;throw error;}
      }});
      bodyStarted=true;
    }catch(error){caught=error;}
    expect(caught).toBe(original);expect(caught).toMatchObject({code:'57014'});expect(bodyStarted).toBe(false);
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({file,index:2,total:60,sha256:createHash('sha256').update(sql).digest('hex'),sqlstate:'57014',statementTimeout:'5s',observerFailed:false});
    expect(receipts[0].elapsedMs).toBeGreaterThanOrEqual(4900);
    expect(receipts[0].samples.length).toBeGreaterThan(0);expect(receipts[0].samples.length).toBeLessThanOrEqual(4);
    expect(receipts[0].samples.some(sample=>sample.waitEventType==='Lock'&&sample.waitEvent==='relation'&&sample.blockers===1)).toBe(true);
    for(const privateInput of [database.connectionString,sql,target.username])expect(JSON.stringify(receipts)).not.toContain(privateInput);
  }finally{
    try{await blocker.query('ROLLBACK');}finally{
      await observer?.close();await blocker.end();await bootstrap.end();await database.dispose();
    }
  }
},15000);
