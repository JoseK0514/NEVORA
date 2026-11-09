import {createHash,timingSafeEqual} from 'node:crypto';
import {parseBillingOwner} from '../../../../../services/commerce/owner-authority';
import {commerceEnabled,currentCommerceConnection} from '@/lib/commerce/access';
import {readBillingOwnerBinding} from '@/lib/commerce/owner-binding';
export async function POST(request:Request){
 const reply=(status:number)=>Response.json({valid:false},{status,headers:{'cache-control':'no-store'}});
 if(!commerceEnabled())return reply(404);
 try{
  const c=await currentCommerceConnection();if(!c.businessId||!c.incarnation||c.role!=='APP')return reply(404);
  const expected=createHash('sha256').update('Bearer '+c.secret).digest(),provided=createHash('sha256').update(request.headers.get('authorization')??'').digest();if(!timingSafeEqual(expected,provided))return reply(401);
  const reader=request.body?.getReader();if(!reader)return reply(400);let raw='',size=0;while(true){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>2048){await reader.cancel();return reply(413);}raw+=Buffer.from(p.value).toString('utf8');}
  const owner=parseBillingOwner(JSON.parse(raw));if(!owner||owner.businessId!==c.businessId||owner.installationId!==c.installationId||owner.incarnation!==c.incarnation)return reply(403);
  const current=await readBillingOwnerBinding({sessionTokenHash:owner.sessionTokenHash,employee:{id:owner.employeeId}},c);
  if(!current||current.business_id!==owner.businessId||current.owner_generation!==owner.generation)return reply(403);
  await c.assertCurrent?.();return Response.json({valid:true,businessId:owner.businessId,installationId:owner.installationId,incarnation:owner.incarnation,employeeId:owner.employeeId,generation:owner.generation},{headers:{'cache-control':'no-store'}});
 }catch{return reply(503);}
}
