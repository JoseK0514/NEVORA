import {neon} from '@neondatabase/serverless';
import {handlePhotoCleanupTrigger} from '../src/lib/clocker/photo-server/platform-worker';
import {readPhotoPlatformBinding} from '../src/lib/clocker/photo-server/platform-lifecycle';

const worker={
 async fetch(request:Request):Promise<Response>{
  const binding=readPhotoPlatformBinding(process.env),url=process.env.DATABASE_URL;
  if(!binding||!url)return new Response(null,{status:503});
  return handlePhotoCleanupTrigger(request,async invocation=>{
   const sql=neon(url);
   const rows=await sql.query('SELECT clocker_photo_platform_cleanup($1,$2) AS result',[binding.workspaceId,invocation],{fetchOptions:{signal:AbortSignal.timeout(8000)}});
   return rows[0]?.result as {backlog:boolean};
  });
 },
};
export default worker;
