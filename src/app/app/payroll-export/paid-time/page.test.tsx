// G98 (gap closure): the paid time export follows the person's language (their saved choice, else the nv-lang cookie or
// the browser's), the same read the person and time off pages use; a failed read is English. Server composition only.
import {createElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,rs} from '@rstest/core';

const language=rs.hoisted(()=>({value:'en' as 'en'|'es',fail:false}));
rs.mock('@/lib/activation/language.server',()=>({readPortalLanguage:async()=>{if(language.fail)throw Error('language_source_unavailable');return {state:'ready',savedLanguage:null,language:language.value};}}));
rs.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'owner',role:'OWNER'}),requireSessionMutationProof:async()=>({employee:{id:'owner',role:'OWNER'},sessionTokenHash:'a'.repeat(64)})}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>({state:'ready',data:await load()})}));
rs.mock('@/lib/company-access/observation',()=>({scopedObservation:()=>null}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children}:{children?:ReactNode})=>children}));
rs.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'fictional-workspace',timeZone:'America/Puerto_Rico'})}));
rs.mock('@/components/payroll-import/export-flow',()=>({PaidTimeExportFlow:({lang}:{lang?:string})=>createElement('p',{'data-lang':lang??'unset'},'flow')}));
import Page from './page';

beforeEach(()=>{language.value='en';language.fail=false;});
const render=async()=>renderToStaticMarkup(await Page({searchParams:Promise.resolve({start:'2026-11-23',end:'2026-11-29'})}));

it('G98: passes the person’s language to the paid time export, and English when that read fails',async()=>{
 language.value='es';
 expect(await render()).toContain('data-lang="es"');
 language.value='en';
 expect(await render()).toContain('data-lang="en"');
 language.fail=true;
 expect(await render()).toContain('data-lang="en"');
});
