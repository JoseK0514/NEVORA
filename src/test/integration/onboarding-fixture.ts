import {Client,Pool} from 'pg';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

export async function freshOnboardingControl(){
 const raw=process.env.NEVORA_ONBOARDING_TEST_ADMIN_URL,owned=process.env.NEVORA_ONBOARDING_TEST_CUSTODY_DIR,marker=process.env.NEVORA_ONBOARDING_TEST_CUSTODY;
 if(!raw||!owned||!marker||!/^[a-f0-9]{32}$/.test(marker)||await readFile(join(owned,'owner'),'utf8')!==marker)throw Error('Onboarding tests require invocation-owned custody.');
 const url=new URL(raw);if(url.hostname!=='127.0.0.1'||url.pathname!=='/postgres'||!url.username.startsWith('nv_onboard_'))throw Error('Invalid owned onboarding target');
 const admin=new Client({connectionString:raw});await admin.connect();const path=await admin.query('SHOW data_directory');if(resolve(path.rows[0].data_directory)!==resolve(owned,'data')){await admin.end();throw Error('Owned onboarding server identity mismatch');}
 const name='nv_onboarding_test_'+randomBytes(10).toString('hex');await admin.query('CREATE DATABASE '+name);url.pathname='/'+name;
 const pool=new Pool({connectionString:url.href,max:8});await pool.query(await readFile(resolve('db/control-migrations/0001_owner_onboarding.sql'),'utf8'));
 return {pool,name,async close(){await pool.end();await admin.query('DROP DATABASE '+name);await admin.end();}};
}
