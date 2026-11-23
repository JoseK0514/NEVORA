import * as actualReact from "react" with { rstest: 'importActual' };
import type {ReactElement,ReactNode} from 'react';
import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';

/* Jose (Nov 21, 2026): every Decline asks first. There is no DOM here, so this file drives the components through a
 * small stand-in for React's hooks: state lives per component (by its place in the tree), effects run after each
 * render when their inputs change, and every `ref` receives a stand-in node whose `focus` is a spy. A "tap" is the
 * element's own onClick; a form's send is its own onSubmit or action. What is proved for each surface:
 *   - the first tap opens the question and sends nothing (and the opener can no longer submit: it is type="button");
 *   - the safe way out sends nothing and brings the buttons back, with focus on the button that opened the question;
 *   - the question's commit sends the original request, once. Approve stays one tap. */
type Slot={value:unknown};type Effect={deps?:unknown[];cleanup?:void|(()=>void);run?:()=>void|(()=>void)};
const host=rs.hoisted(()=>({path:'',cursor:0,slots:new Map<string,unknown[]>(),pending:[] as (()=>void)[]}));
const slot=<T,>(make:()=>T):T=>{const list=host.slots.get(host.path)??host.slots.set(host.path,[]).get(host.path)!;const i=host.cursor++;if(!(i in list))list[i]=make();return list[i] as T;};
rs.mock('react',()=>({...actualReact,
 useState:(initial:unknown)=>{const s=slot<Slot>(()=>({value:typeof initial==='function'?(initial as ()=>unknown)():initial}));return [s.value,(next:unknown)=>{s.value=typeof next==='function'?(next as (old:unknown)=>unknown)(s.value):next;}];},
 useRef:(initial:unknown)=>slot(()=>({current:initial})),
 useCallback:(callback:unknown,deps?:unknown[])=>{const s=slot<{deps?:unknown[];callback:unknown}>(()=>({deps,callback}));if(!deps||!s.deps||deps.some((d,i)=>d!==s.deps![i])){s.deps=deps;s.callback=callback;}return s.callback;},
 useMemo:(make:()=>unknown)=>make(),
 // Signed-in Spanish: components read the person's language (usePortalLang); outside a provider it is the default, English.
 useContext:(context:{_currentValue:unknown})=>context._currentValue,
 useId:()=>slot(()=>`id:${host.path}`),
 useTransition:()=>[false,(run:()=>void)=>run()],
 useEffect:(run:()=>void|(()=>void),deps?:unknown[])=>{const s=slot<Effect>(()=>({}));const changed=!deps||!s.deps||deps.some((d,i)=>d!==s.deps![i]);if(changed){s.deps=deps;host.pending.push(()=>{s.cleanup?.();s.cleanup=run();});}},
}));
const sends=rs.hoisted(()=>({shift:[] as Record<string,string>[],leave:[] as Record<string,string>[]}));
rs.mock('react-dom',()=>({useFormStatus:()=>({pending:false,data:null})}));
rs.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{},push:()=>{}})}));
rs.mock('next/dist/client/components/is-next-router-error',()=>({isNextRouterError:()=>false}));
rs.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:async(data:FormData)=>{sends.shift.push(Object.fromEntries([...data].map(([k,v])=>[k,String(v)])));return {status:'closed'};},reconcileShiftChangeAction:async()=>null}));
rs.mock('@/app/app/requests/actions',()=>({reviewTimeOffAction:async(data:FormData)=>{sends.leave.push(Object.fromEntries([...data].map(([k,v])=>[k,String(v)])));}}));
rs.mock('./time-off-decision-form.css',()=>({}));

const {ShiftChangeForm}=await import('./shift-change-form');
const {ShiftRequestDecide}=await import('./shift-request-decide');
const {TimeOffDecisionForm}=await import('./time-off-decision-form');
const {TimeOffReviewActions}=await import('./time-off-review-actions');
const {ManagerTimeCorrectionsSurface}=await import('./manager-time-corrections');
const {DeclinePlanStep}=await import('./owner-advisor/weekly/weekly-page');
const {reviewCopy}=await import('./review-details/copy');

type El=ReactElement<Record<string,unknown>>;
const focused:string[]=[];
const words=(v:ReactNode):string=>Array.isArray(v)?v.map(words).join(''):v&&typeof v==='object'&&'props'in v?words((v as El).props.children as ReactNode):typeof v==='string'||typeof v==='number'?String(v):'';
/** One render: every function component is called in place (its hooks keyed by where it sits), down to plain elements. */
function expand(v:ReactNode,path:string):ReactNode{
 if(Array.isArray(v))return v.map((child,i)=>expand(child,`${path}.${i}`));
 if(!v||typeof v!=='object'||!('props'in v))return v;
 const el=v as El;
 if(typeof el.type==='function'){const at=`${path}/${el.type.name}${el.key?`#${el.key}`:''}`;host.path=at;host.cursor=0;
  let out:ReactNode;try{out=(el.type as (props:unknown)=>ReactNode)(el.props);}catch{return el;}
  return expand(out,at);}
 if(typeof el.type!=='string')return expand(el.props.children as ReactNode,path);
 const children=expand(el.props.children as ReactNode,`${path}>${el.type}`);
 const node={focus:()=>{focused.push(String(el.props['aria-label']??words(children)));},closest:()=>null,style:{},form:null};
 const ref=el.props.ref as undefined|{current:unknown}|((node:unknown)=>void);if(typeof ref==='function')ref(node);else if(ref)ref.current=node;
 return {...el,props:{...el.props,children}} as El;
}
let root:()=>ReactNode=()=>null,tree:ReactNode=null;
function render(){for(let pass=0;pass<4;pass++){host.pending=[];tree=expand(root(),'root');const effects=host.pending;host.pending=[];if(!effects.length)break;for(const effect of effects)effect();}return tree;}
const under=(v:ReactNode):El[]=>Array.isArray(v)?v.flatMap(child=>under(child)):v&&typeof v==='object'&&'props'in v?[v as El,...under((v as El).props.children as ReactNode)]:[];
const all=(v?:ReactNode)=>under(v===undefined?tree:v);
const buttons=()=>all().filter(n=>n.type==='button');
const button=(test:(n:El)=>boolean)=>{const n=buttons().find(test);if(!n)throw Error('no such button: '+buttons().map(b=>words(b)).join(' | '));return n;};
const named=(label:string)=>(n:El)=>n.props['aria-label']===label||words(n)===label;
const tap=(label:string)=>{(button(named(label)).props.onClick as (event?:unknown)=>void)({currentTarget:{form:null},preventDefault(){}});render();};
const asks=()=>all().filter(n=>n.props.role==='group'&&String(n.props.className??'').startsWith('b-ask'));
const text=()=>words(tree);
const key=(name:string)=>{document.dispatchEvent(Object.assign(new Event('keydown',{cancelable:true}),{key:name}));render();};
const t=reviewCopy();

beforeEach(()=>{host.slots.clear();host.pending=[];focused.length=0;sends.shift.length=0;sends.leave.length=0;
 rs.stubGlobal('window',new EventTarget());rs.stubGlobal('document',Object.assign(new EventTarget(),{querySelector:()=>null}));rs.stubGlobal('navigator',{onLine:true});
 rs.stubGlobal('MutationObserver',class{observe(){}disconnect(){}});rs.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});rs.stubGlobal('requestAnimationFrame',()=>0);rs.stubGlobal('cancelAnimationFrame',()=>{});rs.stubGlobal('CSS',{escape:(value:string)=>value});
 // The form's own fields are added by ShiftChangeForm after this; there is no <form> element to read here.
 rs.stubGlobal('FormData',class extends FormData{constructor(){super();}});});
afterEach(()=>{rs.unstubAllGlobals();});

const ask={question:t.askDeclineSwap,consequence:t.bothKeep('Ana','James'),keep:t.keepRequest,go:t.decline,groupLabel:'Decline the swap request from Ana Colon?',keepLabel:'Keep the swap request from Ana Colon',goLabel:'Decline the swap request from Ana Colon'};
/** The browser's submit: the pressed button's name and value reach the form's own onSubmit. */
async function submitWith(pressed:El){const form=all().find(n=>n.type==='form')!;
 await (form.props.onSubmit as (event:unknown)=>Promise<void>)({preventDefault(){},currentTarget:{},nativeEvent:{submitter:{name:pressed.props.name,value:pressed.props.value}}});render();}

it('shift request (swap, cover, call-out): Decline asks first, Keep request sends nothing, the commit sends the same MANAGER_DECLINE once',async()=>{
 root=()=><ShiftChangeForm fields={{requestId:'r1',expectedRevision:3}} className="q-acts-form"><ShiftRequestDecide decline="MANAGER_DECLINE" declineLabel="Decline swap request from Ana Colon" approve="MANAGER_APPROVE" approveLabel="Approve swap request from Ana Colon" ask={ask}/></ShiftChangeForm>;
 render();
 // Before the question: Decline cannot submit (no name, no value, type="button"); Approve is still the one-tap submit.
 const opener=button(named('Decline swap request from Ana Colon'));
 expect(opener.props.type).toBe('button');expect(opener.props.name).toBeUndefined();expect(opener.props.value).toBeUndefined();
 expect(buttons().filter(n=>n.props.value==='MANAGER_DECLINE')).toHaveLength(0);
 const approve=button(named('Approve swap request from Ana Colon'));expect(approve.props).toMatchObject({type:'submit',name:'kind',value:'MANAGER_APPROVE'});
 tap('Decline swap request from Ana Colon');
 expect(asks()).toHaveLength(1);expect(text()).toContain('Decline this swap?');expect(text()).toContain('Ana and James keep their shifts.');
 expect(sends.shift).toHaveLength(0);
 // The question takes the buttons' place, and focus goes to its words.
 expect(buttons().map(n=>words(n))).toEqual(['Keep request','Decline']);expect(focused.at(-1)).toBe('Decline this swap?');
 expect(button(named('Keep the swap request from Ana Colon')).props.type).toBe('button');
 tap('Keep the swap request from Ana Colon');
 expect(asks()).toHaveLength(0);expect(sends.shift).toHaveLength(0);expect(focused.at(-1)).toBe('Decline swap request from Ana Colon');
 expect(buttons().map(n=>n.props['aria-label'])).toEqual(['Decline swap request from Ana Colon','Approve swap request from Ana Colon']);
 // Escape is the same way out.
 tap('Decline swap request from Ana Colon');expect(asks()).toHaveLength(1);key('Escape');expect(asks()).toHaveLength(0);expect(sends.shift).toHaveLength(0);
 tap('Decline swap request from Ana Colon');
 const commit=button(named('Decline the swap request from Ana Colon'));expect(commit.props).toMatchObject({type:'submit',name:'kind',value:'MANAGER_DECLINE'});
 await submitWith(commit);
 expect(sends.shift).toEqual([{requestId:'r1',expectedRevision:'3',kind:'MANAGER_DECLINE',operationId:expect.any(String)}]);
});

it('open cover: Close request asks first and the commit sends the form’s own MANAGER_CLOSE once',async()=>{
 root=()=><ShiftChangeForm fields={{kind:'MANAGER_CLOSE',requestId:'c1',expectedRevision:2}} className="q-acts-form"><ShiftRequestDecide declineWords={t.closeRequest} pending="Closing…" declineLabel="Close the coverage request from Ana Colon. The shift stays with them."
  ask={{question:t.askCloseCover,consequence:t.keepsShift('Ana'),keep:t.keepRequest,go:t.closeRequest,groupLabel:'Close the coverage request from Ana Colon?',keepLabel:'Keep the coverage request from Ana Colon',goLabel:'Close the coverage request from Ana Colon'}}/></ShiftChangeForm>;
 render();
 expect(buttons().filter(n=>n.props.type==='submit')).toHaveLength(0);
 tap('Close the coverage request from Ana Colon. The shift stays with them.');
 expect(text()).toContain('Close this cover request?');expect(text()).toContain('Ana keeps the shift.');expect(sends.shift).toHaveLength(0);
 tap('Keep the coverage request from Ana Colon');expect(asks()).toHaveLength(0);expect(sends.shift).toHaveLength(0);
 tap('Close the coverage request from Ana Colon. The shift stays with them.');
 // The commit adds no field of its own: no name, no value.
 const close=button(named('Close the coverage request from Ana Colon'));expect(close.props.type).toBe('submit');expect(close.props.name).toBeUndefined();expect(close.props.value).toBeUndefined();
 await submitWith(close);
 expect(sends.shift).toEqual([{kind:'MANAGER_CLOSE',requestId:'c1',expectedRevision:'2',operationId:expect.any(String)}]);
});

it('one question at a time: opening the question on another request closes the first, and nothing is sent',()=>{
 root=()=><ul>{['r1','r2'].map(id=><li key={id}><ShiftChangeForm fields={{requestId:id,expectedRevision:1}}><ShiftRequestDecide decline="DECLINE_CALLOUT" declineLabel={`Decline the report ${id}`} approve="APPROVE_CALLOUT" approveLabel={`Approve the report ${id}`}
  ask={{question:t.askDeclineCallout,consequence:t.staysOnShift(id),keep:t.keepRequest,go:t.decline,groupLabel:`Decline ${id}?`,keepLabel:`Keep ${id}`,goLabel:`Decline ${id}`}}/></ShiftChangeForm></li>)}</ul>;
 render();tap('Decline the report r1');expect(asks().map(n=>n.props['aria-label'])).toEqual(['Decline r1?']);
 tap('Decline the report r2');expect(asks().map(n=>n.props['aria-label'])).toEqual(['Decline r2?']);
 expect(text()).toContain('Decline this call-out?');expect(text()).toContain('r2 stays on the shift.');expect(sends.shift).toHaveLength(0);
});

it('time off request page: Decline asks first; the commit is the same decision=DENIED submit, Approve stays one tap',async()=>{
 root=()=><TimeOffDecisionForm className="c-request__decide"><input type="hidden" name="requestId" value="req-1"/><TimeOffReviewActions name="Ana Colon" corp/></TimeOffDecisionForm>;
 render();
 const opener=button(named('Decline time off for Ana Colon'));expect(opener.props.type).toBe('button');expect(opener.props.name).toBeUndefined();
 expect(buttons().filter(n=>n.props.value==='DENIED')).toHaveLength(0);
 expect(button(named('Approve time off for Ana Colon')).props).toMatchObject({type:'submit',name:'decision',value:'APPROVED'});
 tap('Decline time off for Ana Colon');
 expect(text()).toContain('Decline this request?');expect(text()).toContain('Ana is told it was declined.');expect(sends.leave).toHaveLength(0);
 expect(focused.at(-1)).toBe('Decline this request?');expect(buttons().map(n=>words(n))).toEqual(['Keep request','Decline']);
 tap('Keep time off request for Ana Colon');
 expect(asks()).toHaveLength(0);expect(sends.leave).toHaveLength(0);expect(focused.at(-1)).toBe('Decline time off for Ana Colon');
 tap('Decline time off for Ana Colon');
 const commit=button(n=>n.props.type==='submit');expect(commit.props).toMatchObject({name:'decision',value:'DENIED','aria-label':'Decline time off for Ana Colon'});
 // The browser's submit: the form's fields and the pressed button reach the form's action, which calls the same server action.
 const form=all().find(n=>n.type==='form')!,data=new FormData();data.set('requestId','req-1');data.set(String(commit.props.name),String(commit.props.value));
 await (form.props.action as (data:FormData)=>Promise<void>)(data);
 expect(sends.leave).toEqual([{requestId:'req-1',decision:'DENIED'}]);
});

const correction={id:'66666666-6666-4666-8666-666666666666',kind:'ENTRY_BOUNDARY',status:'PENDING',revision:1,createdAt:'2030-10-07T16:05:00Z',locationId:'loc-1',locationName:'Fuel Coffee Drive',
 originalStartAt:'2030-10-07T12:00:00Z',originalEndAt:'2030-10-07T16:00:00Z',proposedStartAt:'2030-10-07T12:05:00Z',proposedEndAt:'2030-10-07T15:55:00Z',breakName:null,reason:'The tablet stayed open after I left.',baseChanged:false,
 context:{state:'unavailable'},employeeName:'Avery QA',isSelf:false};
it('time correction: Decline asks first, Keep request sends nothing, the commit is the one REJECT decision; Approve stays one tap',()=>{
 const onDecision=rs.fn();
 const snapshot={state:'ready',validForMs:45000,observedAt:'2030-10-07T16:10:00Z',timeZone:'America/Puerto_Rico',requests:[correction,{...correction,id:'77777777-7777-4777-8777-777777777777',employeeName:'Blake QA'}]} as never;
 root=()=><ManagerTimeCorrectionsSurface snapshot={snapshot} loading={false} busyId={null} notice={null} onDecision={onDecision} onRetry={()=>{}} retry={null}/>;
 render();
 tap('Decline correction for Avery QA');
 expect(asks().map(n=>n.props['aria-label'])).toEqual(['Decline the correction for Avery QA?']);
 expect(text()).toContain('Decline this correction?');expect(text()).toContain('The recorded time stays as it is.');expect(onDecision).not.toHaveBeenCalled();
 expect(focused.at(-1)).toBe('Decline this correction?');
 // Another card's question closes this one.
 tap('Decline correction for Blake QA');expect(asks().map(n=>n.props['aria-label'])).toEqual(['Decline the correction for Blake QA?']);
 tap('Keep the correction request for Blake QA');expect(asks()).toHaveLength(0);expect(onDecision).not.toHaveBeenCalled();expect(focused.at(-1)).toBe('Decline correction for Blake QA');
 tap('Decline correction for Avery QA');key('Escape');expect(asks()).toHaveLength(0);expect(onDecision).not.toHaveBeenCalled();
 tap('Decline correction for Avery QA');
 // Inside the question the commit carries the same name the one-tap button had.
 const commit=all(asks()[0]).filter(n=>n.type==='button').at(-1)!;expect(words(commit)).toBe('Decline');
 (commit.props.onClick as ()=>void)();render();
 expect(onDecision).toHaveBeenCalledOnce();expect(onDecision).toHaveBeenCalledWith(expect.objectContaining({id:correction.id,revision:1}),'REJECT');expect(asks()).toHaveLength(0);
 tap('Approve correction for Blake QA');expect(onDecision).toHaveBeenCalledTimes(2);expect(onDecision).toHaveBeenLastCalledWith(expect.objectContaining({employeeName:'Blake QA'}),'APPROVE');
});

it('Rondo weekly plan: Decline asks first, Keep plan sends nothing, the commit declines once',()=>{
 const onDecline=rs.fn();
 root=()=><DeclinePlanStep busy={false} onDecline={onDecline}>{ask=><div className="wk-acts"><button type="button" {...ask}>Decline</button></div>}</DeclinePlanStep>;
 render();tap('Decline');
 expect(text()).toContain('Decline this plan?');expect(text()).toContain('The schedule doesn’t change.');expect(onDecline).not.toHaveBeenCalled();
 tap('Keep plan');expect(asks()).toHaveLength(0);expect(onDecline).not.toHaveBeenCalled();
 tap('Decline');const commit=all(asks()[0]).filter(n=>n.type==='button').at(-1)!;(commit.props.onClick as ()=>void)();render();
 expect(onDecline).toHaveBeenCalledOnce();expect(asks()).toHaveLength(0);
});
