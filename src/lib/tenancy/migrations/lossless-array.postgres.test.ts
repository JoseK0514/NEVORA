import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { Client } from 'pg';
import { readFileSync,realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { parseLosslessTextArrayWire } from './lossless-array';

const leasePath=process.env.F_ARRAY_OWNED_LEASE;
type Lease={scope:string;closed:boolean;root:string;data:string;pid:number;pidStart:string;port:number;database:string;databaseOid:string;marker:string;user:string;credentialFile:string;systemIdentifier:string};
let client:Client;
describe.skipIf(!leasePath)('actual owned PostgreSQL native text array comparison',()=>{
 beforeAll(async()=>{
  const lease=JSON.parse(readFileSync(leasePath!,'utf8')) as Lease;
  expect(lease.scope).toBe('OWNED_LOCAL_F10');expect(lease.closed).toBe(false);
  expect(realpathSync(lease.root)).toBe(lease.root);expect(realpathSync(lease.data)).toBe(join(lease.root,'data'));
  const pid=readFileSync(join(lease.data,'postmaster.pid'),'utf8').split('\n');
  expect(Number(pid[0])).toBe(lease.pid);expect(pid[2]).toBe(lease.pidStart);expect(realpathSync(pid[1])).toBe(lease.data);expect(Number(pid[3])).toBe(lease.port);
  client=new Client({host:'127.0.0.1',port:lease.port,user:lease.user,password:readFileSync(lease.credentialFile,'utf8'),database:lease.database,connectionTimeoutMillis:3000});
  await client.connect();
  const actual=(await client.query("SELECT current_database() db,(SELECT oid::text FROM pg_database WHERE datname=current_database()) oid,shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') marker,current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_control_system()) system_id,session_user::text role,host(inet_server_addr()) host,inet_server_port() port,current_setting('server_version') version,current_setting('server_encoding') encoding")).rows[0];
  expect(actual).toMatchObject({db:lease.database,oid:String(lease.databaseOid),marker:lease.marker,data:lease.data,system_id:lease.systemIdentifier,role:lease.user,host:'127.0.0.1',port:lease.port,encoding:'UTF8'});
  expect(actual.version).toMatch(/^18\.4(?:\s|$)/);expect(client.getTransactionStatus()).toBe('I');
  expect((await client.query("SELECT current_setting('array_nulls') value")).rows[0].value).toBe('on');
 },15000);
 afterAll(async()=>{if(client)await client.end();});

 const accepted=[
  ['empty','{}'],
  ['empty nested','{{},{}}'],
  ['empty deep','{{{}}}'],
  ['one SQL NULL','{NULL}'],
  ['quoted NULL, empty and distinct SQL NULL','{"NULL","",NULL,"null"}'],
  ['ordinary tenant location literals','{loc-1,loc-2,loc-3}'],
  ['comma, brace and quote text','{"a,b","{left}","right}","say\\\"yes"}'],
  ['backslash text','{"a\\\\b","\\\\","x\\\\\\\"y"}'],
  ['unicode and multiline','{"José","東京","line\nnext","🙂"}'],
  ['spaces and semicolon','{  first  , middle space ,a;b,"  preserved  "}'],
  ['escaped unquoted NULL','{N\\ULL,NULL}'],
  ['escaped trailing space','{first\\ , second }'],
  ['zero lower bound','[0:2]={a,NULL,c}'],
  ['negative lower bound','[-3:-1]={a,b,c}'],
  ['nondefault positive lower bound','[7:8]={a,b}'],
  ['single explicit upper bound','[2]={a,b}'],
  ['signed zero prefix','[+0:+1]={a,b}'],
  ['zero-padded negative bounds','[-0002:-0001]={a,b}'],
  ['two dimensions','{{a,NULL},{"NULL",b}}'],
  ['two nondefault bounds','[0:1][-2:-1]={{a,NULL},{"NULL",b}}'],
  ['dimension-prefix whitespace',' [-1:0] \n [3:4] \t = {{a,b},{c,d}} '],
  ['three dimensions','{{{a,b},{c,d}},{{e,f},{g,h}}}'],
  ['six dimensions','{{{{{{a}}}}}}'],
  ['largest accepted native upper bound','[2147483645:2147483646]={a,b}'],
  ['minimum signed integer lower bound','[-2147483648:-2147483647]={a,b}'],
 ] as const;
 for(const [label,input]of accepted)it('matches database dimensions and row-major elements for '+label,async()=>{
  const row=(await client.query('SELECT a::text wire,array_ndims(a) dimension_count FROM (SELECT $1::text[] a) q',[input])).rows[0];
  const dimensions=(await client.query('SELECT array_lower(a,d) lower_bound,array_length(a,d) length FROM (SELECT $1::text[] a) q CROSS JOIN LATERAL generate_series(1,COALESCE(array_ndims(a),0)) d ORDER BY d',[input])).rows;
  const elements=(await client.query('SELECT value FROM unnest($1::text[]) WITH ORDINALITY u(value,n) ORDER BY n',[input])).rows.map(r=>r.value as string|null);
  // Native output is the capture input. Also compare accepted input syntax
  // against this actual server's array_nulls=on interpretation without claiming
  // that input syntax is the original stored wire or that parsing grants access.
  for(const text of [row.wire,input]){
   const parsed=parseLosslessTextArrayWire(text);
   expect(parsed.status,JSON.stringify(parsed)).toBe('PARSED');
   if(parsed.status!=='PARSED')throw new Error('Expected parser to match actual native array');
   const bytes=Buffer.from(text,'utf8');
   expect(parsed.envelope).toMatchObject({kind:'TEXT_ARRAY',wire:{encoding:'UTF8',text,bytesBase64:bytes.toString('base64'),byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},dimensions:dimensions.map(d=>({lowerBound:d.lower_bound,length:d.length})),elements,verification:'PURE_ARRAY_PARSE_NOT_DATABASE_VERIFICATION'});
   expect(parsed.envelope.dimensions.length).toBe(row.dimension_count??0);
   expect(Object.isFrozen(parsed.envelope)).toBe(true);expect(Object.isFrozen(parsed.envelope.dimensions)).toBe(true);expect(Object.isFrozen(parsed.envelope.elements)).toBe(true);
  }
 });

 const rejected=[
  ['ragged dimensions','{{a},{b,c}}'],
  ['declared length mismatch','[0:2]={a,b}'],
  ['dimension count mismatch','[0:1][0:1]={a,b}'],
  ['too many dimensions','{{{{{{{a}}}}}}}','54000'],
  ['out-of-domain bound','[2147483648:2147483648]={a}','54000'],
  ['native forbidden INT_MAX upper bound','[2147483646:2147483647]={a,b}','54000'],
  ['lower bound overflow','[-2147483649:-2147483649]={a}','54000'],
  ['missing element','{a,}'],
  ['unterminated quoted element','{"a}'],
  ['trailing data','{a}x'],
 ] as const;
 for(const [label,input,expectedSqlstate]of rejected)it('refuses native grammar rejected by the actual database: '+label,async()=>{
  let sqlstate:string|undefined;
  try{await client.query('SELECT $1::text[]',[input]);}catch(error){sqlstate=(error as {code?:string}).code;}
  expect(sqlstate).toBe(expectedSqlstate??'22P02');expect(client.getTransactionStatus()).toBe('I');
  expect(parseLosslessTextArrayWire(input).status).toBe('BLOCKED');
 });
});
