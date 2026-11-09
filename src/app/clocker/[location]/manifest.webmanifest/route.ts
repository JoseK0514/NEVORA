import {findActiveLocationByClockerKey} from '@/lib/data/locations';
import {clockerLaunchManifest} from '@/lib/clocker/installation';
export const dynamic='force-dynamic';
const headers={'Content-Type':'application/manifest+json','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'};
export async function GET(_request:Request,{params}:{params:Promise<{location:string}>}):Promise<Response>{
 const {location:key}=await params,manifest=clockerLaunchManifest(key);
 if(!manifest)return new Response(null,{status:404,headers});
 try{
  if(!await findActiveLocationByClockerKey(key))return new Response(null,{status:404,headers});
  return Response.json(manifest,{headers});
 }catch{return Response.json({error:'Clocker launch settings are unavailable.'},{status:503,headers});}
}
