import {afterEach,beforeEach,expect,it,vi} from 'vitest';

const fixture=vi.hoisted(()=>({
 states:[] as unknown[],effects:[] as (()=>void|(()=>void))[],
 start:vi.fn(),pause:vi.fn(),stop:vi.fn(),
 router:{refresh:vi.fn(),replace:vi.fn()},
}));
vi.mock('react',async original=>({
 ...await original<Record<string,unknown>>(),
 useState:(initial:unknown)=>{
  const index=fixture.states.length;fixture.states.push(initial);
  return [initial,(value:unknown)=>{
   fixture.states[index]=typeof value==='function'?value(fixture.states[index]):value;
  }];
 },
 useRef:(current:unknown)=>({current}),
 useEffect:(effect:()=>void|(()=>void))=>{fixture.effects.push(effect);},
}));
vi.mock('next/navigation',()=>({useRouter:()=>fixture.router}));
vi.mock('../app-navigation',()=>({useAppNavigation:()=>null}));
vi.mock('@/lib/private-snapshot-client',()=>({
 createPrivateSnapshotController:()=>({start:fixture.start,pause:fixture.pause,stop:fixture.stop}),
}));

import {ScopedReadFrame} from './scoped-read-frame';

const receipt={authority:'fictional-current-authority',phase:'ready',content:'Current receipt'};
let dispose:void|(()=>void);
beforeEach(async()=>{
 fixture.states=[];fixture.effects=[];vi.clearAllMocks();
 vi.stubGlobal('window',new EventTarget());
 vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible',hasFocus:()=>true}));
 vi.stubGlobal('navigator',{onLine:true});
 ScopedReadFrame({children:'Current receipt'});
 dispose=fixture.effects[0]();
 await Promise.resolve();
 fixture.states[0]=receipt;
 fixture.states[1]={required:false,view:null};
 vi.clearAllMocks();
});
afterEach(()=>{dispose?.();dispose=undefined;vi.unstubAllGlobals();});

it('retains the current receipt and authority on duplicate active window focus',()=>{
 window.dispatchEvent(new Event('focus'));
 window.dispatchEvent(new Event('focus'));
 expect(fixture.states[0]).toBe(receipt);
 expect(fixture.states[1]).toEqual({required:false,view:null});
 expect(fixture.start).not.toHaveBeenCalled();
 expect(fixture.pause).not.toHaveBeenCalled();
});

it.each(['blur','pagehide','offline'])('clears the child on %s and rechecks when focus returns',event=>{
 window.dispatchEvent(new Event(event));
 expect(fixture.states[0]).toEqual({authority:null,phase:'paused',content:null});
 expect(fixture.states[1]).toEqual({required:true,view:null});
 expect(fixture.start).not.toHaveBeenCalled();
 window.dispatchEvent(new Event('focus'));
 expect(fixture.states[0]).toEqual({authority:null,phase:'expired',content:null});
 expect(fixture.start).toHaveBeenCalledTimes(1);
});

it.each(['storage','pageshow','online'])('requires a fresh check on %s even while focused',event=>{
 window.dispatchEvent(new Event(event));
 expect(fixture.states[0]).toEqual({authority:null,phase:'expired',content:null});
 expect(fixture.states[1]).toEqual({required:true,view:null});
 expect(fixture.start).toHaveBeenCalledTimes(1);
});

it('clears hidden content and rechecks after visibility is restored',()=>{
 Object.assign(document,{visibilityState:'hidden'});
 document.dispatchEvent(new Event('visibilitychange'));
 expect(fixture.states[0]).toEqual({authority:null,phase:'paused',content:null});
 Object.assign(document,{visibilityState:'visible'});
 document.dispatchEvent(new Event('visibilitychange'));
 expect(fixture.states[0]).toEqual({authority:null,phase:'expired',content:null});
 expect(fixture.start).toHaveBeenCalledTimes(1);
});
