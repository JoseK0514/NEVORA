import Link from 'next/link';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {requireSession} from '@/lib/auth/session';
import {readAuthLang} from '@/lib/auth-lang.server';
import {commerceEnabled} from '@/lib/commerce/access';
import {payrollFeatureEnabled} from '@/lib/payroll/service';
import {RecoveryFrame} from '@/components/commerce-recovery/frame';
import {BillingRecovery} from '@/components/commerce-recovery/billing';
import styles from '@/components/commerce-recovery/recovery.module.css';
export const metadata:Metadata={title:'Workplace billing',robots:{index:false,follow:false},referrer:'no-referrer'};
export const dynamic='force-dynamic';
export default async function BillingPage(){
 const session=await requireSession();
 if(!commerceEnabled())notFound();
 const lang=await readAuthLang(),payrollEnabled=payrollFeatureEnabled();
 return <RecoveryFrame lang={lang}>{session.role==='OWNER'?<BillingRecovery key={session.id} lang={lang} payrollEnabled={payrollEnabled} billingOrigin={process.env.NEVORA_COMMERCE_UI_ORIGIN??'https://www.thevelani.com'}/>:<>
  <h1>{lang==='es'?'El acceso del negocio necesita atención':'Workplace access needs attention'}</h1>
  <p>{lang==='es'?'Pídele al propietario de tu negocio que revise la facturación. Solo la cuenta del propietario puede administrar la suscripción.':'Ask your workplace Owner to review billing. Only the Owner account can manage the subscription.'}</p>
  {payrollEnabled?<div className={styles.actions}><Link className={styles.secondary} href="/app/my-pay" prefetch={false}>{lang==='es'?'Mis comprobantes de pago':'My pay statements'}</Link></div>:null}
 </>}</RecoveryFrame>;
}
