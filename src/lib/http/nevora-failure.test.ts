import {afterEach,expect,it,vi} from 'vitest';
import {NEVORA_FAILURES,clearsProtectedData,failureRecovery,nevoraFailure,privateReadBody,FAILURE_MESSAGES} from './nevora-failure';

const response=(status:number,failure?:string,body:unknown={state:'unavailable'})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json',...(failure?{'X-Nevora-Failure':failure}:{})}});
afterEach(()=>vi.unstubAllGlobals());

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
 vi.stubGlobal('window',{dispatchEvent:(event:CustomEvent)=>{announced.push(event.detail.recovery);return true;}});
 vi.stubGlobal('CustomEvent',class{type:string;detail:unknown;constructor(type:string,init:{detail:unknown}){this.type=type;this.detail=init.detail;}});
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
