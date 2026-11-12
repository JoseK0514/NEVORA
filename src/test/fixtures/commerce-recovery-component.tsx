// Native-browser presentation fixture only; no application route or provider.
import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PathnameContext} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import {CommerceRecoveryBoundary} from '../../lib/commerce/recovery-boundary';
import {BillingRecovery} from '../../components/commerce-recovery/billing';
declare global {interface Window {recoveryReceipt:{mounted:number;unmounted:number;aborted:string[]}}}
const receipt={mounted:0,unmounted:0,aborted:[] as string[]};
Object.assign(window,{recoveryReceipt:receipt});
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,options)=>{
 options?.signal?.addEventListener('abort',()=>receipt.aborted.push(String(input)),{once:true});
 return nativeFetch(input,options);
};
function Operational(){useEffect(()=>{receipt.mounted++;return()=>{receipt.unmounted++;};},[]);return <aside>Operational pollers and parallel sheet</aside>;}
function Fixture(){
 const initialRecovery=new URLSearchParams(window.location.search).get('initial')==='recovery';
 const [path,setPath]=useState(initialRecovery?'/app/billing':'/app');
 return <PathnameContext.Provider value={path}><nav><button onClick={()=>setPath('/app/billing')}>Enter recovery</button><button onClick={()=>setPath('/app')}>Leave recovery</button></nav>
  <CommerceRecoveryBoundary enabled initialRecovery={initialRecovery} shell={<Operational/>}><BillingRecovery lang="en" payrollEnabled={false} billingOrigin="https://www.thevelani.com"/></CommerceRecoveryBoundary>
 </PathnameContext.Provider>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
