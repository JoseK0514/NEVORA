import { afterAll, beforeAll, expect, it } from 'vitest';
import { createDisposableExchangeDatabase } from './local-postgres';
import { createOwnedPgTransport, type OwnedDatabaseIdentity } from './owned-pg-transport';

let db: Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
let identity: OwnedDatabaseIdentity;
beforeAll(async () => {
  db = await createDisposableExchangeDatabase({ mode: 'current-runtime' });
  [identity] = await db.executor.query<OwnedDatabaseIdentity>({
    text: "SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()", values: [],
  });
  await db.executor.query({ text: 'CREATE TABLE phase_a_transport_probe(id integer PRIMARY KEY, value text NOT NULL)', values: [] });
});
afterAll(async () => { await db?.dispose(); });

it('lazy tagged and parameterized queries do not write until awaited and reuse a recorded result', async () => {
  const sql = createOwnedPgTransport(db.connectionString, identity);
  const insert = sql`INSERT INTO phase_a_transport_probe VALUES(${1},${"O'Reilly; not SQL"}) RETURNING value`;
  expect(await db.executor.query({ text: 'SELECT * FROM phase_a_transport_probe', values: [] })).toEqual([]);
  expect(await insert).toEqual([{ value: "O'Reilly; not SQL" }]);
  expect(await insert).toEqual([{ value: "O'Reilly; not SQL" }]);
  expect(await sql.query('SELECT value FROM phase_a_transport_probe WHERE id=$1', [1])).toEqual([{ value: "O'Reilly; not SQL" }]);
});
it('ordered transaction executes on one actual connection and commits both rows', async () => {
  const sql = createOwnedPgTransport(db.connectionString, identity);
  const results = await sql.transaction([
    sql.query("INSERT INTO phase_a_transport_probe VALUES(2,'first') RETURNING pg_backend_pid() AS pid,txid_current()::text AS transaction"),
    sql.query("INSERT INTO phase_a_transport_probe SELECT 3,value FROM phase_a_transport_probe WHERE id=2 RETURNING pg_backend_pid() AS pid,txid_current()::text AS transaction"),
  ]);
  expect(results[0]).toEqual(results[1]);
  expect(await sql.query('SELECT id FROM phase_a_transport_probe WHERE id IN (2,3) ORDER BY id')).toEqual([{ id: 2 }, { id: 3 }]);
});
it('late transaction failure rolls back every earlier write', async () => {
  const sql = createOwnedPgTransport(db.connectionString, identity);
  await expect(sql.transaction([sql.query("INSERT INTO phase_a_transport_probe VALUES(4,'rollback')"), sql.query('SELECT 1/0')])).rejects.toMatchObject({ code: '22012' });
  expect(await sql.query('SELECT * FROM phase_a_transport_probe WHERE id=4')).toEqual([]);
});
it('rejects mixed, already-executed and duplicate query objects before starting a batch', async () => {
  const sql = createOwnedPgTransport(db.connectionString, identity);
  const other = createOwnedPgTransport(db.connectionString, identity);
  const query = sql.query('SELECT 1');
  await expect(sql.transaction([query, query])).rejects.toThrow('query');
  await expect(sql.transaction([other.query('SELECT 1')])).rejects.toThrow('query');
  await query;
  await expect(sql.transaction([query])).rejects.toThrow('query');
});
it('refuses remote, unowned, wrong-identity and pre-aborted execution', async () => {
  expect(() => createOwnedPgTransport('postgresql://example.invalid/prod', identity)).toThrow();
  expect(() => createOwnedPgTransport(db.connectionString, { ...identity, name: 'production' })).toThrow();
  const wrong = createOwnedPgTransport(db.connectionString, { ...identity, marker: 'fuel-phase3-disposable:00000000-0000-4000-8000-000000000000' });
  await expect(Promise.resolve(wrong.query('SELECT 1'))).rejects.toThrow('ownership');
  const aborted = new AbortController(); aborted.abort();
  const sql = createOwnedPgTransport(db.connectionString, identity);
  await expect(Promise.resolve(sql.query("INSERT INTO phase_a_transport_probe VALUES(5,'never')", [], { fetchOptions: { signal: aborted.signal } }))).rejects.toBeDefined();
  expect(await sql.query('SELECT * FROM phase_a_transport_probe WHERE id=5')).toEqual([]);
});

it('owned Home diagnostics preserve real SQL failure, rollback and subsequent reads when their sink throws',async()=>{
 const samples:Record<string,unknown>[]=[];let enabled=false;
 const transport=createOwnedPgTransport(db.connectionString,identity,{observeHomeEnabled:()=>enabled,observeHome:sample=>{samples.push(sample);throw Error('Owned diagnostic sink failure');}});
 try{
  expect(await transport.query('/* home_authority */ SELECT 3 AS value')).toEqual([{value:3}]);expect(samples).toEqual([]);enabled=true;
  await expect(transport.transaction([transport.query('/* home_authority */ SELECT 1 AS value'),transport.query('SELECT 1/0')])).rejects.toMatchObject({code:'22012'});
  expect(samples.some(sample=>sample.event==='failed'&&sample.code==='other')).toBe(true);
  expect(await transport.query('/* home_authority */ SELECT 17 AS value')).toEqual([{value:17}]);
  expect(samples.filter(sample=>sample.event==='finished')).toHaveLength(2);
 }finally{await transport.close();}
});
