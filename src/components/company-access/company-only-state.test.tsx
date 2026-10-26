import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';

const view=vi.hoisted(()=>({value:null as unknown,throws:false}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({readOperationalAuthority:async()=>{if(view.throws)throw Error('unread');return view.value;}}));
vi.mock('./scoped-read-frame',()=>({ScopedReadFrame:({unavailable}:{unavailable?:React.ReactNode})=><>{unavailable}</>}));
import {companyOnlyRefusal,COMPANY_ONLY_SENTENCE} from './company-only-state';

const proof={employee:{id:'manager',firstName:'Fictional',lastName:'Manager',role:'MANAGER' as const,primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
const ready=(mode:'COMPANY'|'LOCATIONS'|null)=>({state:'ready',employeeId:'manager',role:'MANAGER',source:'OWNER_ASSIGNMENT',scope:mode?{mode,locationIds:mode==='LOCATIONS'?['loc-1']:[]}:null,scopeRevision:2,authority:'a'.repeat(64),locations:[],observedAt:'2026-10-25T12:00:00Z',validForMs:15000});
beforeEach(()=>{view.value=null;view.throws=false;});

it('B-12: a location-scoped Manager gets the Quiet role state, not the company-wide access message',async()=>{
 view.value=ready('LOCATIONS');
 const html=renderToStaticMarkup(await companyOnlyRefusal(proof,'Payroll exports unavailable','access_denied'));
 expect(html).toContain('Not available for your role');expect(html).toContain(COMPANY_ONLY_SENTENCE.replace(/'/g,'&#x27;'));
 expect(html).not.toContain('company-wide management access');
});
it.each([['no scope',()=>{view.value=ready(null);}],['an unread scope',()=>{view.throws=true;}]] as const)('keeps the existing access message for %s',async(_name,arrange)=>{
 arrange();
 const html=renderToStaticMarkup(await companyOnlyRefusal(proof,'Payroll exports unavailable','access_denied'));
 expect(html).toContain('Payroll exports unavailable');expect(html).toContain('company-wide management access');
});
it('never turns an outage into a role refusal',async()=>{
 view.value=ready('LOCATIONS');
 const html=renderToStaticMarkup(await companyOnlyRefusal(proof,'Payroll exports unavailable','read_failed'));
 expect(html).toContain('Payroll exports unavailable');expect(html).not.toContain('Not available for your role');
});
