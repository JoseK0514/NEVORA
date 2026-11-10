import {expect,it,vi} from 'vitest';
const hooks=vi.hoisted(()=>({states:[] as unknown[],index:0}));
vi.mock('react',async original=>({...await original<Record<string,unknown>>(),useState:(initial:unknown)=>[hooks.states[hooks.index++]??initial,()=>{}],useRef:(initial:unknown)=>({current:initial}),useEffect:()=>{}}));
vi.mock('./clocker-motion',()=>({useClockerMotion:()=>({current:null})}));
vi.mock('./clocker-language',()=>({useClockerCopy:()=>((key:string)=>key),useClockerPresentation:()=>({v2:true,locale:'en'}),useClockerSpanish:()=>false,Es:()=>null}));
import {ClockerPunchPanel} from './clocker-punch-panel';
import {ClockerRecoveryHandoff} from './clocker-recovery';
function findHandoff(value:unknown):unknown{
 if(Array.isArray(value))return value.map(findHandoff).find(Boolean);
 if(!value||typeof value!=='object'||!('type'in value)||!('props'in value))return;
 const element=value as {type:unknown;props:{children?:unknown}};
 return element.type===ClockerRecoveryHandoff?element:findHandoff(element.props.children);
}
const subject='a'.repeat(64),view={subject,firstName:'Avery',snapshot:{entry:null,break:null,revision:0},allowedActions:['CLOCK_IN'],breakTypes:[]};
function render(mode:string,pendingSubject=subject){
 hooks.index=0;hooks.states=[view,{subject:pendingSubject,command:{commandId:'private-reference'}},mode,null,null,null,[{commandId:'private-reference',action:'CLOCK_IN'}],0];
 return ClockerPunchPanel({locationKey:'2',timeZone:'UTC',onDone:()=>{}});
}
it('retains the current verified person recovery handoff',()=>{expect(findHandoff(render('recovery'))).toBeTruthy();});
it.each(['auth','other-person'])('withholds saved identifiers when the panel requires %s recovery',mode=>{expect(findHandoff(render(mode))).toBeUndefined();});
it('withholds a pending reference belonging to a different verified subject',()=>{expect(findHandoff(render('recovery','b'.repeat(64)))).toBeUndefined();});
