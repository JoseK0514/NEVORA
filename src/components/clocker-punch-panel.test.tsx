import * as rstestImportedActual0 from "react" with { rstest: 'importActual' };
import {expect,it,rs} from '@rstest/core';
const hooks=rs.hoisted(()=>({states:[] as unknown[],index:0,online:true}));
rs.mock('react',() => ({...rstestImportedActual0,useState:(initial:unknown)=>[hooks.states[hooks.index++]??initial,()=>{}],useRef:(initial:unknown)=>({current:initial}),useEffect:()=>{},useCallback:(fn:unknown)=>fn,useContext:()=>null}));
rs.mock('./clocker-shell',()=>({useReportTabletHealth:()=>{}}));
rs.mock('./clocker-online',()=>({useClockerOnline:()=>hooks.online,useWhenBackOnline:()=>{}}));
rs.mock('./clocker-motion',()=>({useClockerMotion:()=>({current:null})}));
rs.mock('./clocker-language',()=>({useClockerCopy:()=>((key:string)=>key),useClockerKeepNames:()=>((text:string)=>text),ClockerText:()=>null,useClockerPresentation:()=>({v2:true,locale:'en'}),useClockerIntlLocale:()=>'en-US',useClockerSpanish:()=>false,Es:()=>null}));
import {ClockerPunchPanel} from './clocker-punch-panel';
import {ClockerRecoveryHelp,ClockerRecoveryLink} from './clocker-recovery';
import {ClockerIcon} from './clocker-icon';
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

/* Premium pass (Nov 18, 2026): one glyph and one colour per meaning on the clock screen's states. */
const allButtons=(value:unknown,out:{kind?:string;label:string;className?:string}[]=[]):{kind?:string;label:string;className?:string}[]=>{
 if(Array.isArray(value)){for(const item of value)allButtons(item,out);return out;}
 if(value&&typeof value==='object'&&'props'in value){const node=value as {type:unknown;props:{children?:unknown;'data-kind'?:string;className?:string}};
  if(node.type==='button')out.push({kind:node.props['data-kind'],label:texts(node.props.children).join(''),className:node.props.className});else allButtons(node.props.children,out);}
 return out;};
const ringOf=(mode:string)=>{const icon=find(render(mode),ClockerIcon) as {props:{name:string}}|undefined;return icon?.props.name;};
it('draws not confirmed as the amber Question and a stop as the red WarningCircle (decision 2)',()=>{
 hooks.online=true;
 for(const mode of ['recovery','retry','review-current','other-person'])expect(ringOf(mode),mode).toBe('unknown');
 expect(ringOf('unavailable')).toBe('stop');expect(ringOf('storage')).toBe('stop');
 hooks.online=false;expect(ringOf('unavailable')).toBe('offline');hooks.online=true;
 // The circular arrow is never a state's ring.
 for(const mode of ['recovery','retry','review-current','other-person','unavailable','storage','auth'])expect(ringOf(mode),mode).not.toBe('refresh');
});
it('leaves with Done beside a state’s actions, and Start over to sign in again; never Return to PIN',()=>{
 hooks.online=true;
 for(const mode of ['recovery','retry','unavailable','review-current']){const leave=allButtons(render(mode)).find(button=>button.label==='Done');expect(leave,mode).toBeTruthy();expect(leave?.kind,mode).toBeUndefined();}
 expect(allButtons(render('auth')).find(button=>button.kind==='primary')?.label).toBe('Start over');
 expect(allButtons(render('storage')).find(button=>button.kind==='primary')?.label).toBe('Done');
 for(const mode of ['recovery','retry','unavailable','review-current','auth','storage','other-person'])expect(texts(render(mode)).join(' | '),mode).not.toContain('Return to PIN');
});
it('offers no filled action under the offline note on the clock screen; Done is the way on',()=>{
 hooks.online=false;
 const ready=render('ready'),buttons=allButtons(ready);
 expect(buttons.find(button=>button.label==='Clock in')?.kind).toBe('secondary');expect(buttons.find(button=>button.label==='Done')?.kind).toBe('primary');
 expect(buttons.filter(button=>button.kind==='primary')).toHaveLength(1);
 const note=(function walk(value:unknown):{props:Record<string,unknown>}|undefined{if(Array.isArray(value))return value.map(walk).find(Boolean);if(!value||typeof value!=='object'||!('props'in value))return;const node=value as {props:Record<string,unknown>};return 'data-clocker-offline' in node.props?node:walk(node.props.children);})(ready);
 expect(note?.props['data-tone']).toBe('red');
 hooks.online=true;
 const online=allButtons(render('ready'));expect(online.find(button=>button.label==='Clock in')?.kind).toBe('primary');expect(online.find(button=>button.label==='Done')?.kind).toBe('secondary');
});

it('names a break choice with its second line, so the suggested length is announced too',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('./clocker-punch-panel.tsx',import.meta.url),'utf8');
 expect(source).toContain("aria-label={[t('Start {name}',{name:type.name}),breakSub(type)].filter(Boolean).join(', ')}");
 // A space sits between the name and its second line, so the visible words read as two phrases to assistive tech.
 expect(source).toContain("{type.name}{breakSub(type)?<>{' '}<small>{breakSub(type)}</small></>:null}");
});
