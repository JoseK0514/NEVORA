/** Neon strips client-supplied X-Neon-* headers before invoking Functions.
 * Deploy only behind that platform ingress; this is not a generic HTTP worker. */
export async function handlePhotoCleanupTrigger(request:Request,run:(invocation:string)=>Promise<{backlog:boolean}>):Promise<Response>{
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(request.method!=='POST')return new Response(null,{status:405,headers:{...headers,Allow:'POST'}});
 const invocation=request.headers.get('x-neon-trigger-invocation-id');
 if(!invocation||!/^[a-zA-Z0-9._:-]{1,160}$/.test(invocation))return new Response(null,{status:403,headers});
 try{
  const deadline=performance.now()+20000;
  for(let batch=0;batch<10&&performance.now()<deadline;batch++){
   const result=await run(`${invocation}:${batch}`);
   if(typeof result?.backlog!=='boolean')throw Error('Invalid cleanup result');
   if(!result.backlog)return Response.json({ok:true},{headers});
  }
 }catch{/* Cleanup health remains stale until an entire successful run. */}
 return Response.json({error:'Photo cleanup is unavailable.'},{status:503,headers});
}
