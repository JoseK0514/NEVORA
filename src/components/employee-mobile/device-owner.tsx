'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {browserRuntime,DeviceController,observeController,type DeviceSnapshot} from '../../lib/notifications/device-client';
import {DeviceSetupContent} from '../portal-device-setup';
import {isPopoverOpen} from '../kit/popover-open';
import {useEmployeeMobile} from './use-mobile';
import {usePathname} from 'next/navigation';
import type {UserRole} from '../../lib/domain';

type InstallEvent=Event&{prompt():Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
type Owner={snapshot:DeviceSnapshot|null;paused:boolean;ending:boolean;canInstall:boolean;installMessage:string;install():void;refresh():void;enable():void;turnOff(expectedGeneration?:string|null):void;test():void;postpone():void;reopen():void};
const Context=createContext<Owner|null>(null);
export const useEmployeeDevice=()=>useContext(Context);

/** One shell lifetime for page, desktop popover and responsive navigation. */
export function EmployeeDeviceProvider({authority,enabled,children}:{authority?:string;enabled:boolean;children:ReactNode}){
 const client=useRef<DeviceController|null>(null),prompt=useRef<InstallEvent|null>(null),active=useRef(true),ended=useRef(false);
 const [snapshot,setSnapshot]=useState<DeviceSnapshot|null>(null),[paused,setPaused]=useState(false),[ending,setEnding]=useState(false),[canInstall,setCanInstall]=useState(false),[installMessage,setInstallMessage]=useState('');
 useEffect(()=>{
  if(!enabled||!authority)return;
  ended.current=false;active.current=true;
  const owner=new DeviceController(browserRuntime(authority),next=>{if(ended.current)return;setSnapshot({...next});setPaused(!active.current);});client.current=owner;
  const stop=observeController(owner);
  const pause=()=>{active.current=false;setPaused(true);};
  const resume=()=>{if(ended.current||document.visibilityState==='hidden'||navigator.onLine===false)return;active.current=true;if(owner.snapshot.validUntil&&owner.snapshot.validUntil<=performance.now()){setPaused(true);void owner.start();}else{setPaused(false);void owner.reconcile();}};
  const visibility=()=>document.visibilityState==='hidden'?pause():resume();
  const end=()=>{ended.current=true;active.current=false;owner.dispose();setSnapshot(null);setPaused(true);setEnding(true);prompt.current=null;setCanInstall(false);};
  const beforeInstall=(event:Event)=>{event.preventDefault();if(ended.current)return;prompt.current=event as InstallEvent;setCanInstall(true);};
  window.addEventListener('blur',pause);window.addEventListener('focus',resume);window.addEventListener('pagehide',pause);window.addEventListener('pageshow',resume);window.addEventListener('offline',pause);window.addEventListener('online',resume);window.addEventListener('nevora:signout',end);window.addEventListener('beforeinstallprompt',beforeInstall);document.addEventListener('visibilitychange',visibility);
  const poll=setInterval(()=>{if(active.current&&!ended.current)void owner.reconcile();},30000);void owner.start();
  return()=>{ended.current=true;stop();client.current=null;clearInterval(poll);window.removeEventListener('blur',pause);window.removeEventListener('focus',resume);window.removeEventListener('pagehide',pause);window.removeEventListener('pageshow',resume);window.removeEventListener('offline',pause);window.removeEventListener('online',resume);window.removeEventListener('nevora:signout',end);window.removeEventListener('beforeinstallprompt',beforeInstall);document.removeEventListener('visibilitychange',visibility);};
 },[authority,enabled]);
 useEffect(()=>{
  if(!snapshot?.validUntil||snapshot.state==='error'||snapshot.accessChanged)return;
  const timer=setTimeout(()=>{setPaused(true);if(active.current&&!ended.current)void client.current?.start();},Math.max(0,snapshot.validUntil-performance.now()));return()=>clearTimeout(timer);
 },[snapshot]);
 function install(){
  const event=prompt.current;if(!event||paused||ended.current)return;
  prompt.current=null;setCanInstall(false);
  void event.prompt().then(()=>event.userChoice).then(choice=>{if(!ended.current)setInstallMessage(choice.outcome==='accepted'?'Install request accepted. Open NEVORA from its icon to check setup.':'Install postponed. You can use your browser menu later.');}).catch(()=>{if(!ended.current)setInstallMessage('Use your browser menu to add NEVORA to your Home Screen.');});
 }
 const act=(kind:'start'|'enable'|'turnOff'|'test'|'dismiss'|'reopen')=>{if(active.current&&!ended.current)void client.current?.[kind]();};
 return <Context.Provider value={{snapshot,paused,ending,canInstall,installMessage,install,refresh:()=>act('start'),enable:()=>act('enable'),turnOff:expected=>{if(active.current&&!ended.current)void client.current?.turnOff(expected);},test:()=>act('test'),postpone:()=>act('dismiss'),reopen:()=>act('reopen')}}>{children}</Context.Provider>;
}

/** Incumbent desktop presentation, sharing the same current-device controller. */
export function EmployeeDevicePopover({role}:{role:UserRole}){
 const owner=useEmployeeDevice(),mobile=useEmployeeMobile(),pathname=usePathname(),surface=useRef<HTMLDivElement>(null),opener=useRef<HTMLElement|null>(null),offered=useRef(false),[instructions,setInstructions]=useState(false);
 useEffect(()=>{if(mobile||pathname==='/app/profile/device-alerts'||offered.current||!owner?.snapshot||!['ready','install'].includes(owner.snapshot.state))return;offered.current=true;if(document.activeElement===document.body)surface.current?.showPopover();},[mobile,owner?.snapshot,pathname]);
 useEffect(()=>{
  const element=surface.current;if(!element)return;
  const toggle=(event:Event)=>{
   if((event as ToggleEvent).newState==='open'){
    const active=document.activeElement;opener.current=active instanceof HTMLElement&&active.getAttribute('popovertarget')==='portal-device-settings'?active:null;
    owner?.reopen();requestAnimationFrame(()=>{if(isPopoverOpen(element))element.querySelector<HTMLButtonElement>('.portal-device-close')?.focus();});
   }else{const target=opener.current;opener.current=null;requestAnimationFrame(()=>{const active=document.activeElement;if(active instanceof HTMLElement&&active!==document.body&&!element.contains(active)&&active.getClientRects().length)return;if(target?.isConnected)target.focus();});}
  };element.addEventListener('toggle',toggle);return()=>element.removeEventListener('toggle',toggle);
 },[owner,mobile]);
 if(mobile)return null;
 const snapshot=owner?.snapshot;
 return <div ref={surface} id="portal-device-settings" className="portal-device-settings" popover="auto" aria-labelledby="portal-device-title" data-role={role}>
  <div className="portal-device-heading"><strong>Device settings</strong><button type="button" className="portal-device-close" popoverTarget="portal-device-settings" popoverTargetAction="hide" aria-label="Close device settings">×</button></div>
  {snapshot&&!owner?.paused&&!owner?.ending?<DeviceSetupContent state={snapshot.state} standalone={snapshot.standalone} ios={snapshot.capabilities.requiresStandalone} installPrompt={owner?.canInstall??false} testAllowed={snapshot.server.testAllowed} instructions={instructions} message={snapshot.message??owner?.installMessage}
   onEnable={()=>owner?.enable()} onDismiss={()=>{owner?.postpone();surface.current?.hidePopover();}} onInstructions={()=>setInstructions(true)} onInstall={()=>owner?.install()} onTurnOff={()=>owner?.turnOff()} onTest={()=>owner?.test()} onRetry={()=>owner?.refresh()}/>:<p role="status">{owner?.ending?'Signing out…':owner?.paused?'Device settings paused. Return to this window to check again.':'Checking this device…'}</p>}
 </div>;
}
