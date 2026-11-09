import type{WorkspaceRoutingConfig}from'./config.server';
import {it,expect} from 'vitest';
import {sealWorkspaceToken,openWorkspaceToken,type TokenPurpose} from './token-envelope.server';
import {resolveWorkspaceBinding} from './resolver.server';
import type {ControlStore} from '../onboarding/control-store.server';
const config={environment:'test' as const,portalBaseDomain:'portal.example.invalid',controlDatabaseUrl:'postgresql://fixture@localhost/fictional',encryptionKey:Buffer.alloc(32,9).toString('base64url'),tokenKey:Buffer.alloc(32,8).toString('base64url')};
async function binding(slug='alpha',incarnation='1',routing:WorkspaceRoutingConfig=config){
 const row={id:slug==='alpha'?'170837ce-471d-4c6f-a322-aa73ce9863d6':'270837ce-471d-4c6f-a322-aa73ce9863d6',canonical_origin:`https://${slug}.portal.example.invalid`,environment:'test',incarnation,revision:'1',lifecycle:'ACTIVE',provider_project_id:'fictional',app_secret_ref:'5d332a0d-69ab-45a4-9c0b-e4d2c54a2d87',app_role_name:'nv_app',worker_secret_ref:null,worker_role_name:null};
 return resolveWorkspaceBinding({origin:row.canonical_origin},{query:async()=>({rows:[row]})} as unknown as ControlStore,routing);
}
const purposes:TokenPurpose[]=['SESSION','RECOVERY','INVITATION','PASSKEY_LOGIN','PASSKEY_REGISTER','CLOCKER_DEVICE','CLOCKER_SETUP','CLOCKER_IDENTITY','CLOCKER_ENROLLMENT','CALENDAR','INSTALLATION','CLEANUP','FILE'];
it.each(purposes)('binds %s to the company/incarnation/purpose without exposing its inner proof',async purpose=>{
 const a=await binding(),b=await binding('beta'),restored=await binding('alpha','2'),inner='fictional-private-bearer';
 const wrapped=sealWorkspaceToken(a,purpose,inner,2000,1000);
 expect(wrapped).not.toContain(inner);expect(openWorkspaceToken(a,purpose,wrapped,1500)).toBe(inner);
 expect(openWorkspaceToken(b,purpose,wrapped,1500)).toBeNull();expect(openWorkspaceToken(restored,purpose,wrapped,1500)).toBeNull();
 expect(openWorkspaceToken(a,purpose==='SESSION'?'RECOVERY':'SESSION',wrapped,1500)).toBeNull();
 expect(openWorkspaceToken(a,purpose,wrapped,2000)).toBeNull();expect(openWorkspaceToken(a,purpose,inner,1500)).toBeNull();
 expect(openWorkspaceToken(a,purpose,wrapped+'x',1500)).toBeNull();
});
it('rejects cloned custody and invalid lifetimes before issuing a token',async()=>{
 const a=await binding();expect(()=>sealWorkspaceToken({...a},'SESSION','inner',2000,1000)).toThrow();
 expect(()=>sealWorkspaceToken(a,'SESSION','inner',1000,1000)).toThrow();expect(()=>sealWorkspaceToken(a,'SESSION','x'.repeat(3000),2000,1000)).toThrow();
});

it('protects the actual browser cookie value while preserving raw server session hashes',async()=>{
 const {bindWorkspaceCookies}=await import('./cookies.server');
 const values=new Map<string,{name:string;value:string;options:Record<string,unknown>}>();
 const store={get:(name:string)=>values.get(name),getAll:()=>[...values.values()],set:(name:string,value:string,options:Record<string,unknown>)=>{values.set(name,{name,value,options});}};
 const a=bindWorkspaceCookies(store,await binding()),b=bindWorkspaceCookies(store,await binding('beta'));
 a.set('fuel_session','fictional-inner-proof',{maxAge:60,domain:'.example.invalid',httpOnly:false});
 expect(values.get('fuel_session')?.value).toMatch(/^nw1_/);expect(a.get('fuel_session')?.value).toBe('fictional-inner-proof');
 expect(b.get('fuel_session')).toBeUndefined();expect(b.getAll()).toEqual([]);
 expect(values.get('fuel_session')?.options).not.toHaveProperty('domain');expect(values.get('fuel_session')?.options.httpOnly).toBe(true);
 values.set('fuel_session',{name:'fuel_session',value:'copied-raw-proof',options:{}});expect(a.get('fuel_session')).toBeUndefined();
});

it.each(purposes)('machine routing cannot open or seal %s browser envelopes',async purpose=>{const web=await binding(),machine=await binding('alpha','1',{...config,tokenKey:undefined,secretScope:'COMMERCE_APP_ONLY'});const token=sealWorkspaceToken(web,purpose,'fictional-inner-proof',Date.now()+60000);expect(openWorkspaceToken(machine,purpose,token)).toBeNull();expect(()=>sealWorkspaceToken(machine,purpose,'fictional-inner-proof',Date.now()+60000)).toThrow();});
