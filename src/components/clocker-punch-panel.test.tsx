import {expect,it,vi} from 'vitest';
const hooks=vi.hoisted(()=>({states:[] as unknown[],index:0,online:true}));
vi.mock('react',async original=>({...await original<Record<string,unknown>>(),useState:(initial:unknown)=>[hooks.states[hooks.index++]??initial,()=>{}],useRef:(initial:unknown)=>({current:initial}),useEffect:()=>{},useCallback:(fn:unknown)=>fn,useContext:()=>null}));
vi.mock('./clocker-shell',()=>({useReportTabletHealth:()=>{}}));
vi.mock('./clocker-online',()=>({useClockerOnline:()=>hooks.online,useWhenBackOnline:()=>{}}));
vi.mock('./clocker-motion',()=>({useClockerMotion:()=>({current:null})}));
vi.mock('./clocker-language',()=>({useClockerCopy:()=>((key:string)=>key),useClockerKeepNames:()=>((text:string)=>text),useClockerPresentation:()=>({v2:true,locale:'en'}),useClockerIntlLocale:()=>'en-US',useClockerSpanish:()=>false,Es:()=>null,ClockerText:()=>null}));
import {ClockerPunchPanel} from './clocker-punch-panel';
import {ClockerRecoveryHelp,ClockerRecoveryLink} from './clocker-recovery';
function find(value:unknown,type:unknown):unknown{
 if(Array.isArray(value))return value.map(item=>find(item,type)).find(Boolean);
 if(!value||typeof value!=='object'||!('type'in value)||!('props'in value))return;
 const element=value as {type:unknown;props:{children?:unknown}};
 return element.type===type?element:find(element.props.children,type);
}
const findHandoff=(value:unknown)=>find(value,ClockerRecoveryLink)??find(value,ClockerRecoveryHelp);
const subject='a'.repeat(64),view={subject,firstName:'Avery',snapshot:{entry:null,break:null,revision:0},allowedActions:['CLOCK_IN'],breakTypes:[]};
let others=3,attemptAt:number|null=null;
function render(mode:string,pendingSubject=subject,help=false){
 hooks.index=0;// State order in the Direction B panel: view, pending, mode, message, sendingAction, photo, receipt, references, now, otherCount, attemptAt, reached, helpFor.
 hooks.states=[view,{subject:pendingSubject,command:{commandId:'private-reference',action:'CLOCK_OUT'}},mode,null,null,null,null,[{commandId:'private-reference',action:'CLOCK_IN'}],1,others,attemptAt,true,help?mode:null];
 return ClockerPunchPanel({locationKey:'2',timeZone:'UTC',onDone:()=>{}});
}
it('retains the current verified person recovery handoff',()=>{expect(find(render('recovery'),ClockerRecoveryLink)).toBeTruthy();});
it.each(['auth','other-person'])('withholds saved identifiers when the panel requires %s recovery',mode=>{expect(findHandoff(render(mode))).toBeUndefined();expect(findHandoff(render(mode,subject,true))).toBeUndefined();});
it('withholds a pending reference belonging to a different verified subject',()=>{expect(findHandoff(render('recovery','b'.repeat(64)))).toBeUndefined();expect(findHandoff(render('recovery','b'.repeat(64),true))).toBeUndefined();});
// Nov 14 inspection (NV-185): other people's saved punches reach the help as a count only.
it('passes only a count of other people’s saved punches to the handoff',()=>{
 const handoff=find(render('recovery',subject,true),ClockerRecoveryHelp) as {props:{otherCount:number;references:{commandId:string}[];commandId:string|null}};
 expect(handoff.props.otherCount).toBe(3);expect(handoff.props.references).toEqual([{commandId:'private-reference',action:'CLOCK_IN'}]);expect(handoff.props.commandId).toBe('private-reference');
});
// Phase 8 (#4): the help is its own card state, in place of the screen it was opened from, so nothing scrolls inside it.
it('opens the saved-punch help in place of the screen it came from',()=>{
 const open=render('recovery',subject,true) as {props:{'data-clocker-help'?:string;'data-clocker-state'?:string}};
 expect(open.props['data-clocker-help']).toBe('');expect(open.props['data-clocker-state']).toBe('recovery');
 expect(texts(open).join(' | ')).not.toContain('Check if it saved');expect(find(open,ClockerRecoveryLink)).toBeUndefined();
 const ready=render('ready',subject,true) as {props:{'data-clocker-help'?:string}};
 expect(ready.props['data-clocker-help']).toBe('');
});

/** Every string drawn directly in the tree (child components are not expanded). */
function texts(value:unknown,out:string[]=[]):string[]{
 if(typeof value==='string'){out.push(value);return out;}
 if(Array.isArray(value)){for(const item of value)texts(item,out);return out;}
 if(value&&typeof value==='object'&&'props'in value)texts((value as {props:{children?:unknown}}).props.children,out);
 return out;
}
// Phase 6 (RA-6, MK-8): a punch that could not be confirmed names the action, never "failed" and never "saved".
it('says which punch is not confirmed, that the tablet kept it, and how many others are saved',()=>{
 others=2;attemptAt=null;hooks.online=true;
 const shown=texts(render('recovery')).join(' | ');
 expect(shown).toContain('Your clock out is not confirmed yet.');
 expect(shown).toContain('Tell a manager now.');expect(shown).toContain('This tablet kept your punch and won’t record it twice.');
 expect(shown).toContain('2 more saved on this tablet.');expect(shown).toContain('Check if it saved');
 expect(shown).not.toMatch(/failed|not saved|sign in/i);expect(shown).not.toContain('private-reference');
 attemptAt=Date.UTC(2026,10,17,13,2);
 expect(texts(render('recovery')).join(' | ')).toContain('Your clock out at 1:02 PM is not confirmed yet.');
 others=1;expect(texts(render('recovery')).join(' | ')).toContain('1 more saved on this tablet.');
 others=0;expect(texts(render('recovery')).join(' | ')).not.toContain('more saved on this tablet');
 others=3;attemptAt=null;
});
it('adds the no-connection line while the tablet is offline, on the waiting screens only',()=>{
 hooks.online=false;
 expect(texts(render('recovery')).join(' | ')).toContain('No connection. This tablet checks again by itself when it returns.');
 expect(texts(render('unavailable')).join(' | ')).toContain('No connection');
 hooks.online=true;
 expect(texts(render('recovery')).join(' | ')).not.toContain('No connection.');
});
it('uses plain words for the clock screen titles and buttons',()=>{
 for(const [mode,title] of [['recovery','Check your last punch'],['retry','Check your last punch'],['sending','Recording…'],['storage','This tablet can’t read its saved punches'],['unavailable','We couldn’t load your time'],['other-person','Someone else’s punch is waiting'],['auth','Enter your PIN again'],['review-current','Your earlier punch wasn’t recorded']] as const)
  expect(texts(render(mode)),mode).toContain(title);
 expect(texts(render('retry'))).toContain('Send it again');
});
// Phase 8 (#5): once the check found nothing, the filled button is Send it again, the one its sentence names.
it('makes Send it again the filled button on the retry screen and Check if it saved the quiet link',()=>{
 const buttons=(value:unknown,out:{kind?:string;label:string}[]=[]):{kind?:string;label:string}[]=>{
  if(Array.isArray(value)){for(const item of value)buttons(item,out);return out;}
  if(value&&typeof value==='object'&&'props'in value){const node=value as {type:unknown;props:{children?:unknown;'data-kind'?:string}};
   if(node.type==='button')out.push({kind:node.props['data-kind'],label:texts(node.props.children).join('')});else buttons(node.props.children,out);}
  return out;};
 const retry=buttons(render('retry'));
 expect(retry.find(button=>button.kind==='primary')?.label).toBe('Send it again');expect(retry.find(button=>button.label==='Check if it saved')?.kind).toBeUndefined();
 expect(buttons(render('recovery')).find(button=>button.kind==='primary')?.label).toBe('Check if it saved');
});
