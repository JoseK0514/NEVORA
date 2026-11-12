import type {Metadata} from 'next';
import {clockerReturnPath} from '@/lib/commerce/recovery-routes';
import {notFound} from 'next/navigation';
import {commerceEnabled} from '@/lib/commerce/access';
import {readAuthLang} from '@/lib/auth-lang.server';
import {RecoveryFrame} from '@/components/commerce-recovery/frame';
import styles from '@/components/commerce-recovery/recovery.module.css';
export const metadata:Metadata={title:'Clocker access',robots:{index:false,follow:false},referrer:'no-referrer'};
export const dynamic='force-dynamic';
export default async function PausedClockerPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 if(!commerceEnabled())notFound();
 const params=await searchParams,from=clockerReturnPath(params.from),lang=await readAuthLang(),unavailable=params.reason==='billing_status_unavailable';
 return <RecoveryFrame lang={lang}><p className={styles.eyebrow}>Clocker</p>
  <h1>{lang==='es'?(unavailable?'No se puede comprobar el acceso':'El acceso al Clocker está pausado'):(unavailable?'Access could not be checked':'Clocker access is paused')}</h1>
  <p>{lang==='es'?'No se puede registrar tiempo en este momento. Pídele al propietario de tu negocio que revise el acceso y la facturación.':'Clocking is unavailable right now. Ask your workplace Owner to review access and billing.'}</p>
  <div className={styles.actions}>{from?<a className={styles.action} href={from}>{lang==='es'?'Intentar el Clocker de nuevo':'Try Clocker again'}</a>:null}<a className={styles.secondary} href="/login?returnTo=%2Fapp%2Fbilling">{lang==='es'?'Iniciar sesión como propietario':'Owner sign in'}</a></div>
 </RecoveryFrame>;
}
