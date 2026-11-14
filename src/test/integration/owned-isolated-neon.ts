import {neon as realNeon,neonConfig,type NeonQueryFunction} from '@neondatabase/serverless';
import {Pool} from 'pg';
import type {OwnedIsolatedTarget} from './owned-isolated-runtime';
export type {NeonQueryFunction} from '@neondatabase/serverless';
let configured=false;
/** SQL transport substitution in the owned mirror only. Original routing,
 * binding, principal, session and business SQL remain byte-identical. */
export function neon(uri:string):NeonQueryFunction<false,false>{
 if(!configured){
  if(process.env.NEVORA_WORKSPACE_MODE!=='isolated'||process.env.NEVORA_ONBOARDING_ENVIRONMENT!=='test'||!process.env.NEVORA_OWNED_ISOLATED_TARGETS)throw Error('Owned isolated transport not configured');
  const targets=JSON.parse(process.env.NEVORA_OWNED_ISOLATED_TARGETS) as OwnedIsolatedTarget[];
  const pools=new Map(targets.map(target=>[target.uri,{target,pool:new Pool({connectionString:target.connectionUrl,max:4,connectionTimeoutMillis:3000,statement_timeout:10000,idleTimeoutMillis:1000,allowExitOnIdle:true})}]));
  neonConfig.fetchFunction=async(_url:unknown,options:RequestInit)=>{
   const selected=pools.get(new Headers(options.headers).get('Neon-Connection-String')??'');if(!selected)throw Error('Non-owned isolated SQL target refused');
   const {target,pool}=selected,client=await pool.connect();
   try{
    const actual=(await client.query("SELECT current_user role,datname name,oid::int oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()")).rows[0];
    if(actual?.name!==target.name||actual.oid!==target.oid||actual.marker!==target.marker||actual.role!==new URL(target.uri).username)throw Error('Owned isolated SQL identity changed');
    const body=JSON.parse(String(options.body)),queries=body.queries??[body];await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    const results=[];
    for(const query of queries){const result=await client.query({text:query.query,values:query.params??[],rowMode:'array',types:{getTypeParser:()=>((value:string)=>value)}});results.push({command:result.command,rowCount:result.rowCount,fields:result.fields.map(field=>({name:field.name,dataTypeID:field.dataTypeID})),rows:result.rows,rowAsArray:true});}
    await client.query('COMMIT');return Response.json(body.queries?{results}:results[0]);
   }catch(error){await client.query('ROLLBACK');const problem=error as {message?:string;code?:string};return Response.json({message:problem.message??'Owned isolated SQL failed',code:problem.code??'XX000'},{status:400});}
   finally{client.release();}
  };
  configured=true;
 }
 return realNeon(uri);
}
