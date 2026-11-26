import * as actualReact from 'react' with {rstest: 'importActual'};
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
import {mkdirSync,writeFileSync} from 'node:fs';
const fixture=rs.hoisted(()=>({snapshot:null as unknown,sourceKey:'',operations:new Map<string,unknown>()}));
rs.mock('react',()=>({...actualReact,useState:(initial:unknown)=>{
 const value=typeof initial==='function'?(initial as ()=>unknown)():initial;
 if(value&&typeof value==='object'&&'snapshot' in value&&'refreshing' in value)return actualReact.useState({...value,snapshot:fixture.snapshot,refreshing:false,paused:false});
 if(value&&typeof value==='object'&&'sourceKey' in value)return actualReact.useState({...value,sourceKey:fixture.sourceKey});
 if(value instanceof Map)return actualReact.useState(fixture.operations);
 return actualReact.useState(value);
}}));
rs.mock('./use-mobile',()=>({useEmployeeBScreen:()=>true}));
rs.mock('next/navigation',()=>({usePathname:()=>'/app/exchange',useRouter:()=>({refresh:()=>{}})}));
rs.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:rs.fn(),reconcileShiftChangeAction:rs.fn()}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {ResponsiveEmployeeCreation} from './creation';
import {ResponsiveEmployeeRequests} from './requests';
import {PickupOperation} from './pickup-operation';
import {creationKey,type CreationMode} from '@/lib/employee-creation';
const authority='a'.repeat(64);
const fields={sourceShiftId:'own',sourceEpisodeId:'11111111-1111-4111-8111-111111111111',sourceTermsFingerprint:'v1:'+'a'.repeat(64)};
const source={id:'own',date:'2026-11-25',weekStart:'2026-11-23',startTime:'09:00',endTime:'17:00',location:'Condado',position:'Barista',lead:false,fields};
const render=(node:actualReact.ReactNode,lang:'en'|'es',name:string)=>{
 const html=renderToStaticMarkup(<PortalLangProvider lang={lang}>{node}</PortalLangProvider>);
 const dir='.omo/evidence/phase3-schedule/smoke-repair';mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/entry-${name}-${lang}.html`,html);
 return html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
};
for(const mode of ['swap','cover','callout'] as CreationMode[])it(`the responsive ${mode} entry follows the saved portal language after its private read`,()=>{
 fixture.sourceKey=creationKey(fields);
 fixture.snapshot={state:'ready',kind:'creation',authority,observedAt:'2026-11-24T12:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',enabled:true,mode,selection:'own',source,targets:[],partial:false,check:{allowed:true,notice:null},coverage:{allowed:true,notice:null}};
 const node=<ResponsiveEmployeeCreation authority={authority} mode={mode} sourceId="own"><div>Server fallback</div></ResponsiveEmployeeCreation>;
 const es=render(node,'es',mode),en=render(node,'en',mode);
 expect(es).not.toContain('Server fallback');expect(es).not.toMatch(/\b(?:AM|PM)\b|Your shift|Swap shift|Can’t work this shift|Note for your manager|Your teammate/);
 expect(es).toContain('9:00 a. m.');expect(es).toContain('5:00 p. m.');expect(es).toContain('Cancelar');
 expect(en).toContain(mode==='swap'?'Swap shift':mode==='cover'?'Offer for cover':'Can’t work this shift');expect(en).toContain('9:00 AM');
});
it('the responsive open-shifts entry translates its real Pickup action, accessible name and manager-confirmation paragraph',()=>{
 fixture.operations=new Map([['open',new PickupOperation('open',2)]]);
 fixture.snapshot={state:'ready',authority,observedAt:'2026-11-24T12:00:00Z',timeZone:'America/Puerto_Rico',validForMs:45000,modules:{marketplace:true,timeOff:true},recent:[],incoming:0,open:[{id:'open',revision:2,date:'2026-12-01',startTime:'13:00',endTime:'19:00',location:'Condado',position:'Barista',check:'eligible',notice:null,outcome:'pending'}]};
 const node=<ResponsiveEmployeeRequests authority={authority} mode="open"><div>Server fallback</div></ResponsiveEmployeeRequests>;
 const es=render(node,'es','open'),en=render(node,'en','open');
 expect(es).toContain('Tomar');expect(es).toContain('Tu gerente');expect(es).not.toMatch(/Pick up|Your manager confirms|\b(?:AM|PM)\b/);
 expect(en).toContain('Pick up');expect(en).toContain('Your manager confirms before the shift is yours. You’ll get a notification either way.');
});
