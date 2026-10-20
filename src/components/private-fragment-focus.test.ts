import {afterEach,beforeEach,expect,it,vi} from 'vitest';

// Exercise the real hook's effect lifecycle; native visibility/focus is also
// covered by the held Attendance read in the owned Phase D browser scenario.
const hooks=vi.hoisted(()=>({effects:[] as (()=>(()=>void)|void)[],ref:{current:''}}));
vi.mock('react',()=>({
 useEffect:(effect:()=>(()=>void)|void)=>hooks.effects.push(effect),
 useRef:()=>hooks.ref,
}));
import {usePrivateFragmentFocus} from './private-fragment-focus';

let frames:Map<number,FrameRequestCallback>,sequence:number,dispose:(()=>void)|void;
let active:object,body:object,target:ReturnType<typeof row>;
let rows:Map<string,ReturnType<typeof row>>,observers:TestResizeObserver[];
function row(){
 const element={visible:false,isConnected:true,focus:vi.fn(()=>{if(element.visible&&element.isConnected)active=element;}),
  scrollIntoView:vi.fn(),getClientRects:()=>element.visible&&element.isConnected?[{}]:[]};
 return element;
}
class TestResizeObserver{
 connected=false;
 constructor(readonly callback:()=>void){observers.push(this);}
 observe(){this.connected=true;}
 disconnect(){this.connected=false;}
}
function flush(){const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(0));}
function resize(){observers.filter(observer=>observer.connected).forEach(observer=>observer.callback());flush();}
function useMount(ready=true){usePrivateFragmentFocus('correction-',ready);return hooks.effects.at(-1)!();}
beforeEach(()=>{
 hooks.effects=[];hooks.ref.current='';frames=new Map();sequence=0;observers=[];body={};active=body;target=row();rows=new Map([['correction-fixture',target]]);
 vi.stubGlobal('window',Object.assign(new EventTarget(),{location:{hash:'#correction-fixture'}}));
 vi.stubGlobal('document',{getElementById:(id:string)=>rows.get(id)??null,get activeElement(){return active;}});
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++sequence,callback);return sequence;});
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
 vi.stubGlobal('ResizeObserver',TestResizeObserver);
 vi.stubGlobal('getComputedStyle',()=>({visibility:'visible'}));
});
afterEach(()=>{dispose?.();dispose=undefined;vi.unstubAllGlobals();});

it('waits for a ready but display-hidden row to render before consuming its focus intent',()=>{
 dispose=useMount();flush();expect(active).toBe(body);expect(target.focus).not.toHaveBeenCalled();
 target.visible=true;resize();expect(active).toBe(target);expect(target.focus).toHaveBeenCalledTimes(1);
 expect(target.scrollIntoView).toHaveBeenCalledOnce();
 active=body;resize();window.dispatchEvent(new Event('hashchange'));flush();
 expect(active).toBe(body);expect(target.focus).toHaveBeenCalledTimes(1);
});
it('cancels pending reveal focus when the protected snapshot leaves ready',()=>{
 dispose=useMount();flush();dispose?.();dispose=useMount(false);target.isConnected=false;target.visible=true;resize();flush();
 expect(active).toBe(body);expect(target.focus).not.toHaveBeenCalled();
 expect(observers.every(observer=>!observer.connected)).toBe(true);
});
it('does not focus a former hash target when a different target is selected',()=>{
 dispose=useMount();flush();const next=row();next.visible=true;rows.set('correction-next',next);
 window.location.hash='#correction-next';window.dispatchEvent(new Event('hashchange'));flush();
 expect(active).toBe(next);target.visible=true;resize();expect(active).toBe(next);expect(target.focus).not.toHaveBeenCalled();
});
it.each(['attendance-','timecard-','request-'])('preserves visible immediate arrival for the shared %s consumer',prefix=>{
 target.visible=true;rows.set(prefix+'fixture',target);window.location.hash='#'+prefix+'fixture';
 usePrivateFragmentFocus(prefix,true);dispose=hooks.effects.at(-1)!();flush();
 expect(active).toBe(target);expect(target.focus).toHaveBeenCalledOnce();
});
it('does not attempt focus for an absent or unrelated private target',()=>{
 window.location.hash='#unrelated';dispose=useMount();flush();expect(target.focus).not.toHaveBeenCalled();
 window.location.hash='#correction-absent';window.dispatchEvent(new Event('hashchange'));flush();
 expect(active).toBe(body);expect(observers.every(observer=>!observer.connected)).toBe(true);
});
