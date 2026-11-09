import 'server-only';
import {cookies as nextCookies} from 'next/headers';
import {workspaceMode} from './config.server';
import {currentWorkspaceBinding} from './context.server';
import {workspaceBindingFacts,type WorkspaceBinding} from './resolver.server';
import {sealWorkspaceToken,openWorkspaceToken,type TokenPurpose} from './token-envelope.server';
const protectedNames:Readonly<Record<string,TokenPurpose>>={fuel_session:'SESSION',nevora_pk_login:'PASSKEY_LOGIN',nevora_pk_register:'PASSKEY_REGISTER',nevora_clocker:'CLOCKER_DEVICE',nevora_clocker_setup:'CLOCKER_SETUP',nevora_clocker_identity:'CLOCKER_IDENTITY',fuel_push_installation:'INSTALLATION',fuel_push_cleanup:'CLEANUP'};
function purpose(name:string){return protectedNames[name.replace(/^__Host-/,'')];}
function decoded(value:unknown,binding:WorkspaceBinding){
 if(!value||typeof value!=='object'||!('name' in value)||!('value' in value)||typeof value.name!=='string')return value;
 const p=purpose(value.name);if(!p)return value;const token=openWorkspaceToken(binding,p,value.value);return token===null?undefined:{...value,value:token};
}
/** Protect browser transport only; returned inner proofs still require current
 * database/session/employee authority. The underlying store remains request-owned. */
export function bindWorkspaceCookies<T extends object>(store:T,binding:WorkspaceBinding):T{
 return new Proxy(store,{get(target,key){const fn=Reflect.get(target,key);if(typeof fn!=='function')return fn;
  if(key==='get')return (...args:unknown[])=>decoded(Reflect.apply(fn,target,args),binding);
  if(key==='getAll')return (...args:unknown[])=>{const values=Reflect.apply(fn,target,args) as unknown[];return values.map(v=>decoded(v,binding)).filter(v=>v!==undefined);};
  if(key==='set')return (...args:unknown[])=>{
   const object=args[0]&&typeof args[0]==='object'?args[0] as Record<string,unknown>:null;
   const name=object?.name??args[0],value=object?.value??args[1];
   if(typeof name==='string'&&purpose(name)&&typeof value==='string'){
    const o=(object??(args[2]&&typeof args[2]==='object'?args[2]:{})) as Record<string,unknown>;
    const expiry=o.expires instanceof Date?o.expires.getTime():Date.now()+(typeof o.maxAge==='number'?o.maxAge:14*86400)*1000;
    const wrapped=value&&expiry>Date.now()?sealWorkspaceToken(binding,purpose(name),value,expiry):'';
    const safe:Record<string,unknown>={...o,httpOnly:true,path:'/',sameSite:o.sameSite??'strict',...(workspaceBindingFacts(binding).record.environment==='production'?{secure:true}:{})};delete safe.domain;
    if(object)return Reflect.apply(fn,target,[{...safe,name,value:wrapped}]);
    return Reflect.apply(fn,target,[name,wrapped,safe]);
   }
   return Reflect.apply(fn,target,args);
  };
  return fn.bind(target);
 }});
}
export async function workspaceCookies():Promise<Awaited<ReturnType<typeof nextCookies>>>{
 const store=await nextCookies();return workspaceMode()==='single_company'?store:bindWorkspaceCookies(store,await currentWorkspaceBinding());
}
