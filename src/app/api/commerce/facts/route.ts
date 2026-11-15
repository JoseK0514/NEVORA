import {createHash,timingSafeEqual} from 'node:crypto';
import {currentCommerceConnection,commerceEnabled} from '@/lib/commerce/access';
import {readInstallationFactSnapshot} from '@/lib/commerce/installation-facts.server';
export async function GET(request:Request){
 if(!commerceEnabled())return Response.json({error:{code:'not_enabled'}},{status:404});
 try{
  const c=await currentCommerceConnection(),supplied=createHash('sha256').update(request.headers.get('authorization')??'').digest(),expected=createHash('sha256').update(`Bearer ${c.secret}`).digest();
  if(!timingSafeEqual(supplied,expected))return Response.json({error:{code:'unauthorized'}},{status:401});
  const facts=await readInstallationFactSnapshot(c);await c.assertCurrent?.();
  return Response.json(facts,{headers:{'cache-control':'no-store'}});
 }catch{return Response.json({error:{code:'installation_not_ready'}},{status:503,headers:{'cache-control':'no-store'}});}
}
