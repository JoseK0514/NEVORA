import {expect,it} from 'vitest';
import {Client} from 'pg';
import {createDisposableFoundationDatabase} from './local-postgres';

const settings="SELECT current_setting('TimeZone') AS zone,current_setting('DateStyle') AS style,current_setting('transaction_isolation') AS isolation";
const canonical={zone:'UTC',style:'ISO, YMD',isolation:'read committed'};
it('gives injected business executors and independent lock clients one explicit canonical contract',async()=>{
 const db=await createDisposableFoundationDatabase({mode:'current-runtime'}),client=new Client({connectionString:db.connectionString});
 try{
  expect(await db.executor.query({text:settings,values:[]})).toEqual([canonical]);
  await client.connect();expect((await client.query(settings)).rows).toEqual([canonical]);
 }finally{await client.end();await db.dispose();}
});
it('restores canonical database defaults after a local override and pooled DISCARD',async()=>{
 const db=await createDisposableFoundationDatabase({mode:'current-runtime'});
 try{
  const result=await db.executor.transaction([{text:"SET LOCAL TimeZone='Pacific/Honolulu'",values:[]},{text:"SET LOCAL DateStyle='SQL, DMY'",values:[]},{text:settings,values:[]}]);
  expect(result[2]).toEqual([{zone:'Pacific/Honolulu',style:'SQL, DMY',isolation:'read committed'}]);
  expect(await db.executor.query({text:settings,values:[]})).toEqual([canonical]);
 }finally{await db.dispose();}
});
