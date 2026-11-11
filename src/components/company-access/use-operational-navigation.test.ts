import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {UserRole} from '@/lib/domain';
const fixture=vi.hoisted(()=>({effects:[] as (()=>void|(()=>void))[],decode:undefined as undefined|((v:unknown)=>unknown),start:vi.fn(),pause:vi.fn(),stop:vi.fn()}));
vi.mock('react',async original=>({...await original<Record<string,unknown>>(),useState:(initial:unknown)=>[initial,vi.fn()],useRef:(current:unknown)=>({current}),useEffect:(effect:()=>void|(()=>void))=>fixture.effects.push(effect)}));
vi.mock('@/lib/private-snapshot-client',()=>({createPrivateSnapshotController:(_changed:unknown,_read:unknown,decode:(v:unknown)=>unknown)=>{fixture.decode=decode;return {start:fixture.start,pause:fixture.pause,stop:fixture.stop,refresh:vi.fn()};}}));
import {useOperationalNavigation} from './use-operational-navigation';
let dispose:void|(()=>void);
beforeEach(()=>{fixture.effects=[];fixture.decode=undefined;vi.clearAllMocks();vi.stubGlobal('window',new EventTarget());vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));vi.stubGlobal('navigator',{onLine:true});});
afterEach(()=>{dispose?.();dispose=undefined;vi.unstubAllGlobals();});
it.each<UserRole>(['OWNER','MANAGER'])('rechecks %s shell identity on resume and retires a replacement actor once',async role=>{
 const changed=vi.fn();useOperationalNavigation('OLD',role,undefined,changed);dispose=fixture.effects[0]();await Promise.resolve();
 expect(fixture.start).toHaveBeenCalledOnce();expect(fixture.decode).toBeTypeOf('function');
 const result=fixture.decode!({state:'ready',employeeId:'NEW',role:'MANAGER',source:'OWNER_ASSIGNMENT',scope:{mode:'COMPANY',locationIds:[]},scopeRevision:1,authority:'fictional',locations:[],observedAt:'2026-11-10T12:00:00Z',validForMs:15000});
 expect(result).toEqual({state:'unavailable',reason:'access_denied'});fixture.decode!({state:'unavailable',reason:'access_denied'});expect(changed).toHaveBeenCalledExactlyOnceWith('identity');
});
it.each<UserRole>(['EMPLOYEE','LEAD'])('does not start management polling for %s',async role=>{useOperationalNavigation('E',role);dispose=fixture.effects[0]();await Promise.resolve();expect(fixture.start).not.toHaveBeenCalled();});
