import {Pool} from 'pg';
import {randomBytes} from 'node:crypto';
import type {freshOnboardingControl} from './onboarding-fixture';
import {controlPrincipalGrants} from '@/lib/onboarding/control-principals.server';
import {createControlStore} from '@/lib/onboarding/control-store.server';
export async function restrictedOnboardingControl(db:Awaited<ReturnType<typeof freshOnboardingControl>>){
 const roles=['nv_control_app_'+randomBytes(12).toString('hex'),'nv_control_provision_'+randomBytes(12).toString('hex')],pools:Pool[]=[],urls:string[]=[];
 for(const role of roles){const password=randomBytes(32).toString('base64url');await db.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'`);const u=new URL(db.connectionUrl);u.username=role;u.password=password;urls.push(u.href);pools.push(new Pool({connectionString:u.href,max:4}));}
 for(const sql of controlPrincipalGrants(roles[0],roles[1]))await db.pool.query(sql);
 return {store:createControlStore(pools[0]),provisionerStore:createControlStore(pools[1]),appUrl:urls[0],roles,pools,async close(){for(const p of pools)await p.end();for(const role of roles){await db.pool.query('DROP OWNED BY '+role);await db.pool.query('DROP ROLE '+role);}}};
}
