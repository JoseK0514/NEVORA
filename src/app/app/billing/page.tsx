import Link from 'next/link';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {readSessionMutationProof,requireSession} from '@/lib/auth/session';
import {readSavedLanguage} from '@/lib/activation/language.server';
import {isAuthLang, type AuthLang, AUTH_COPY} from '@/lib/auth-copy';
import {ReloadLanguage} from '@/components/commerce-recovery/language-switch';
import {copy as pageCopy} from './page-copy';
import {readAuthLang} from '@/lib/auth-lang.server';
import {commerceEnabled} from '@/lib/commerce/access';
import {getWorkspace} from '@/lib/data/workspaces';
import {payrollFeatureEnabled} from '@/lib/payroll/service';
import {QuietLegal} from '@/components/brand-legal';
import {PortalSignout} from '@/components/portal-signout';
import {RecoveryFrame} from '@/components/commerce-recovery/frame';
import {BillingRecovery} from '@/components/commerce-recovery/billing';
import {unreachableNotice} from '@/components/commerce-recovery/copy';
import styles from '@/components/commerce-recovery/recovery.module.css';
/** The tab's title follows what the page returns: with billing switched off the page is "not found", so the title
 * says that too (review Nov 14, 2026). */
type BillingParams = {searchParams?:Promise<Record<string,string|string[]|undefined>>};
async function billingLanguage(params:BillingParams):Promise<AuthLang>{
 const requested = (await params.searchParams)?.billingLang;
 if (isAuthLang(requested)) return requested;
 try {
  const proof = await readSessionMutationProof();
  const saved = proof && await readSavedLanguage(proof);
  if (saved) return saved;
 } catch { /* The existing sign-in language remains available during recovery. */ }
 return readAuthLang();
}
export async function generateMetadata(params:BillingParams={}):Promise<Metadata>{
 const enabled=commerceEnabled();
 const lang=enabled ? await billingLanguage(params) : await readAuthLang();
 const title=enabled ? pageCopy[lang].workplaceBilling : pageCopy[lang].pageNotFound;
 return {title,robots:{index:false,follow:false},referrer:'no-referrer'};
}
export const dynamic='force-dynamic';
export default async function BillingPage({searchParams}:BillingParams={}){
 const session=await requireSession();
 if(!commerceEnabled())notFound();
 const lang=await billingLanguage({searchParams}),payrollEnabled=payrollFeatureEnabled(),owner=session.role==='OWNER';
 // JR-9: the Owner's dates read in the workplace's time zone when it can be read; without it they stay labelled UTC.
 const timeZone=owner?await getWorkspace().then(workspace=>workspace.timeZone).catch(()=>null):null;
 // The gate's own reason; only "the billing check could not be reached" changes what a non-Owner is told.
 const unreachable=!owner&&(await searchParams)?.reason==='billing_status_unavailable';
 // JR-12: the page has no shell, so it carries its own Sign out (the shell's action), for every role.
 const signOut=<PortalSignout><button className={styles.quiet} type="submit">{lang==='es'?'Cerrar sesión':'Sign out'}</button></PortalSignout>;
 return <RecoveryFrame lang={lang} language={<ReloadLanguage lang={lang} label={AUTH_COPY[lang].langLabel} billingView/>} below={signOut} legal={<QuietLegal lang={lang}/>}>{owner?<BillingRecovery key={session.id} lang={lang} payrollEnabled={payrollEnabled} timeZone={timeZone} billingOrigin={process.env.NEVORA_COMMERCE_UI_ORIGIN??'https://www.thevelani.com'}/>:<>
  <h1>{lang==='es'?'El acceso del negocio necesita atención':'Workplace access needs attention'}</h1>
  <p>{unreachable
   ?unreachableNotice(lang)+pageCopy[lang].ifItKeepsHappeningTellYourWorkplaceOwner
   :pageCopy[lang].askYourWorkplaceOwnerToReviewBillingOnlyThe}</p>
  {/* Phase 5 consistency (as the Owner's page): one filled button only when there is something to retry; the way to
   * pay statements is a text link, never a second pill. */}
  {/* J18 polish (Nov 24, 2026): one actions block, as on the Owner's page, so the links have its gap (--b-space-20) under
   * the paragraph whether or not Try again is there. */}
  {unreachable||payrollEnabled?<div className={styles.actions}>
   {unreachable?<Link className={styles.action} href="/app" prefetch={false}>{lang==='es'?'Intentar de nuevo':'Try again'}</Link>:null}
   {payrollEnabled?<div className={`${styles.links} ${styles.linksStack}`}><Link className={styles.quiet} href="/app/my-pay" prefetch={false}>{lang==='es'?'Mis comprobantes de pago':'My pay statements'}</Link></div>:null}
  </div>:null}
 </>}</RecoveryFrame>;
}
