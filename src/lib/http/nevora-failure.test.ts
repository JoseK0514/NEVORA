import {afterEach,expect,it,rs} from '@rstest/core';
import {NEVORA_FAILURES,NOT_ALLOWED_MESSAGE,announceFailure,clearsProtectedData,denialOf,failureRecovery,nevoraFailure,privateReadBody,FAILURE_MESSAGES} from './nevora-failure';

const response=(status:number,failure?:string,body:unknown={state:'unavailable'})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json',...(failure?{'X-Nevora-Failure':failure}:{})}});
afterEach(()=>{ rs.unstubAllGlobals(); });

it('maps every contract value to its recovery (CLAUDE-CONTRACT.md table)',()=>{
 expect(Object.fromEntries(NEVORA_FAILURES.map(code=>[code,failureRecovery(code)]))).toEqual({
  authentication_required:'sign_in',access_denied:'access_ended',actor_mismatch:'access_ended',view_invalid:'refresh_view',
  origin_mismatch:'origin',origin_unavailable:'origin',request_intent_required:'contract',cross_site_request:'contract',json_required:'contract',
  invalid_request:'contract',source_unavailable:'unavailable',conflict:'reread'});
 expect(['sign_in','access_ended','refresh_view','origin'].every(r=>clearsProtectedData(r as never))).toBe(true);
 expect(['contract','unavailable','reread'].some(r=>clearsProtectedData(r as never))).toBe(false);
});
it('ignores unknown header values and never names an origin or suggests sign-in for origin problems',()=>{
 expect(nevoraFailure(response(403,'something_else'))).toBeNull();
 expect(nevoraFailure(response(403,'origin_mismatch'))).toBe('origin_mismatch');
 expect(FAILURE_MESSAGES.origin.title+FAILURE_MESSAGES.origin.body).not.toMatch(/https?:|vercel|\.app\b/i);
 expect(FAILURE_MESSAGES.origin.body).toContain('Signing in again won’t fix this');
});
it('turns a read into data or a reason: data-clearing failures end access, the rest are unknown (not zero)',async()=>{
 const announced:string[]=[];
 rs.stubGlobal('window',{dispatchEvent:(event:CustomEvent)=>{announced.push(event.detail.recovery);return true;}});
 rs.stubGlobal('CustomEvent',class{type:string;detail:unknown;constructor(type:string,init:{detail:unknown}){this.type=type;this.detail=init.detail;}});
 expect(await privateReadBody(response(200,undefined,{state:'ready'}))).toEqual({ok:true,body:{state:'ready'}});
 expect(await privateReadBody(response(401,'authentication_required'))).toMatchObject({ok:false,reason:'access_denied'});
 expect(await privateReadBody(response(403,'view_invalid'))).toMatchObject({ok:false,reason:'access_denied'});
 expect(await privateReadBody(response(503,'origin_unavailable'))).toMatchObject({ok:false,reason:'access_denied'});
 expect(await privateReadBody(response(503,'source_unavailable'))).toMatchObject({ok:false,reason:'read_failed'});
 expect(await privateReadBody(response(409,'conflict'))).toMatchObject({ok:false,reason:'read_failed'});
 expect(await privateReadBody(response(400,'invalid_request'))).toMatchObject({ok:false,reason:'read_failed'});
 // Without the header, the old status rule still holds.
 expect(await privateReadBody(response(403))).toMatchObject({ok:false,reason:'access_denied',failure:null});
 expect(announced).toEqual(['sign_in','refresh_view','origin','contract']);
});

// QA A3-06 (Nov 21, 2026): a signed-in person who lacks a permission is not told their session ended.
it('tells a refusal from a signed-out session',()=>{
 expect(denialOf('authentication_required',401)).toBe('signed_out');
 expect(denialOf('actor_mismatch',403)).toBe('signed_out');
 expect(denialOf('access_denied',403)).toBe('not_allowed');
 expect(denialOf(null,401)).toBe('signed_out');
 expect(denialOf(null,403)).toBe('not_allowed');
 for(const failure of ['view_invalid','origin_mismatch','origin_unavailable','source_unavailable','conflict'] as const)expect(denialOf(failure,403)).toBeNull();
 expect(denialOf(null,503)).toBeNull();
});
it('a protected read reports the denial with its reason',async()=>{
 expect(await privateReadBody(response(403,'access_denied'))).toMatchObject({ok:false,reason:'access_denied',denial:'not_allowed'});
 expect(await privateReadBody(response(401,'authentication_required'))).toMatchObject({ok:false,reason:'access_denied',denial:'signed_out'});
 expect(await privateReadBody(response(503,'source_unavailable'))).toMatchObject({ok:false,reason:'read_failed',denial:null});
});

// QA A3-06 recheck (Nov 22, 2026): the page-level notice tells a refusal ("not allowed") from an ended or changed access.
it('announces a refusal as not allowed, and other access changes as before',()=>{
 const seen:unknown[]=[];const target=new EventTarget();
 const g=globalThis as unknown as {window?:unknown};const before=g.window;
 g.window={dispatchEvent:(e:Event)=>{seen.push((e as CustomEvent).detail);return target.dispatchEvent(e);}};
 try{
  announceFailure('access_denied');announceFailure('actor_mismatch');announceFailure('authentication_required');
  expect(seen).toEqual([{recovery:'access_ended',notAllowed:true},{recovery:'access_ended',notAllowed:false},{recovery:'sign_in',notAllowed:false}]);
  expect(NOT_ALLOWED_MESSAGE).toEqual({title:'You don’t have access to this',body:'Ask the Owner if you need it.'});
 }finally{g.window=before;}
});

it('lets Things to do own its access-denied card while still announcing session failures', async () => {
 const dispatchEvent=rs.fn();
 rs.stubGlobal('window',{dispatchEvent});
 const options={inlineAccessDenied:true};
 await expect(privateReadBody(response(403,'access_denied'),options)).resolves.toMatchObject({reason:'access_denied',denial:'not_allowed'});
 expect(dispatchEvent).not.toHaveBeenCalled();
 await expect(privateReadBody(response(401,'authentication_required'),options)).resolves.toMatchObject({denial:'signed_out'});
 expect(dispatchEvent).toHaveBeenCalledTimes(1);
});
