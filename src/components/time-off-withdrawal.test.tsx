import type {ReactElement,ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {redirect,notFound,forbidden,unauthorized} from 'next/navigation';
import type {WithdrawalActionState} from '../lib/time-off-withdrawal';
const host=vi.hoisted(()=>({state:{outcome:'idle'} as WithdrawalActionState,pending:false}));
vi.mock('react',async()=>({...await vi.importActual<typeof import('react')>('react'),
 useActionState:(reduce:(state:WithdrawalActionState,form:FormData)=>Promise<WithdrawalActionState>)=>[host.state,async(form:FormData)=>{host.pending=true;try{const next=await reduce(host.state,form);host.state=next;return next;}finally{host.pending=false;}},host.pending],
 useEffect:()=>{},
}));
vi.mock('next/navigation',async()=>({...await vi.importActual<typeof import('next/navigation')>('next/navigation'),useRouter:()=>({refresh:()=>{}})}));
vi.mock('@/app/app/requests/actions',()=>({withdrawTimeOffAction:vi.fn()}));
import {withdrawTimeOffAction} from '@/app/app/requests/actions';
import {TimeOffWithdrawal} from './time-off-withdrawal';
const requestId='dc6b44c9-6e3f-4f0e-890c-328067ebfe9e';
const operationId='TIME_OFF_WITHDRAW:dc6b44c9-6e3f-4f0e-890c-328067ebfe9e';
const receipt={requestId,operationId,status:'CANCELLED' as const,reviewedBy:'employee',reviewedAt:'2030-01-01 00:00:00.123456+00'};
const render=()=>TimeOffWithdrawal({requestId,dateLabel:'Oct 7, 2030'});
const html=()=>renderToStaticMarkup(render());
function nodes(v:ReactNode):ReactElement<Record<string,unknown>>[]{if(Array.isArray(v))return v.flatMap(nodes);if(!v||typeof v!=='object'||!('props'in v))return [];const node=v as ReactElement<Record<string,unknown>>;return [node,...nodes(node.props.children as ReactNode)];}
function form(){const data=new FormData();for(const node of nodes(render()))if(node.type==='input'&&node.props.type==='hidden')data.set(String(node.props.name),String(node.props.value));data.set('confirmed','yes');return data;}
const submit=(data:FormData=form())=>(render().props.action as (form:FormData)=>Promise<WithdrawalActionState>)(data);
beforeEach(()=>{host.state={outcome:'idle'};host.pending=false;vi.clearAllMocks();vi.stubEnv('__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS','true');});
afterEach(()=>vi.unstubAllEnvs());
it('recovers rejected browser proxy into an unconfirmed outcome with the same protected retry controls',async()=>{
 vi.mocked(withdrawTimeOffAction).mockRejectedValueOnce(TypeError('Failed to fetch'));
 expect(await submit()).toEqual({outcome:'unavailable'});
 expect(html()).toContain('The outcome could not be confirmed');expect(html()).toContain('Retry same withdrawal');
 expect(html()).toContain(`value="${requestId}"`);expect(html()).toContain(`value="${operationId}"`);expect(html()).toContain('name="confirmed"');
});
it('after a committed response is lost, retry sends the original identity and renders the first cancellation receipt',async()=>{
 const attempts:Record<string,FormDataEntryValue>[]=[];let committed=false;
 vi.mocked(withdrawTimeOffAction).mockImplementation(async(_state,data)=>{attempts.push(Object.fromEntries(data));if(!committed){committed=true;throw Error('Response lost after commit');}return {outcome:'withdrawn',receipt};});
 expect(await submit()).toEqual({outcome:'unavailable'});expect(html()).toContain('Retry same withdrawal');
 expect(await submit()).toEqual({outcome:'withdrawn',receipt});
 expect(attempts).toEqual([{requestId,operationId,confirmed:'yes'},{requestId,operationId,confirmed:'yes'}]);
 expect(host.state.receipt).toEqual(receipt);expect(html()).toContain('Your request was withdrawn');expect(html()).not.toContain('Retry same withdrawal');
});
it.each(['redirect','not-found','forbidden','unauthorized','nested-redirect'] as const)('preserves actual Next %s navigation/auth signal instead of labeling it transport loss',async kind=>{
 let signal:unknown;try{if(kind==='redirect'||kind==='nested-redirect')redirect('/login');else if(kind==='not-found')notFound();else if(kind==='forbidden')forbidden();else unauthorized();}catch(error){signal=error;}
 expect(signal).toBeDefined();expect(signal).toHaveProperty('digest');
 vi.mocked(withdrawTimeOffAction).mockRejectedValueOnce(kind==='nested-redirect'?new Error('Wrapped framework signal',{cause:signal}):signal);
 await expect(submit()).rejects.toBe(signal);
 expect(host.state.outcome).toBe('idle');expect(html()).not.toContain('Retry same withdrawal');
});
