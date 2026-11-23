import type {ReactNode} from 'react';
import {BrandWordmark} from '@/components/brand-mark';
import {AUTH_COPY} from '@/lib/auth-copy';
import {NUVORA_BRAND} from '@/lib/brand';
import {ReloadLanguage} from './language-switch';
import styles from './recovery.module.css';
/** The billing pages' frame, on the Direction B sign-in look (review Nov 14, 2026, UI-2): the teal band with the
 * wordmark and the language switch above a lifted white card on phones and tablets; from 1024px the teal brand panel
 * beside the card. `language` replaces the reloading switch, `below` sits under the card (Sign out) and `legal` is the
 * footer line. `brandLine={false}` leaves the sign-in brand line out of the panel: the paused Clocker page passes it
 * (Phase 2, K15), because a shared tablet is not the employee sign-in. */
export function RecoveryFrame({children,lang='en',language,below,legal,brandLine=true}: {children:ReactNode;lang?:'en'|'es';language?:ReactNode;below?:ReactNode;legal?:ReactNode;brandLine?:boolean}) {
 // The brand line breaks after its first comma, as on sign-in.
 const t=AUTH_COPY[lang],at=t.bandLine.indexOf(', ');
 return <main className={styles.frame} lang={lang}>
  <aside className={styles.panel} aria-label="NEVORA">
   <span className={styles.panelMark}><BrandWordmark/></span>
   {brandLine?<div><p className={styles.panelEyebrow}>{t.panelEyebrow}</p><p className={styles.panelLine}>{at<0?t.bandLine:<>{t.bandLine.slice(0,at+1)}<br/>{t.bandLine.slice(at+2)}</>}</p></div>:null}
   <small className={styles.powered}>{NUVORA_BRAND.poweredBy}</small>
  </aside>
  <div className={styles.side}>
   <header className={styles.top}><span className={styles.brand}><BrandWordmark/></span>{language??<ReloadLanguage lang={lang} label={t.langLabel}/>}</header>
   <div className={styles.content}><section className={styles.card}>{children}</section>{below?<div className={styles.below}>{below}</div>:null}</div>
   <footer className={styles.foot}>{legal??<p>© 2026 VELANI LLC</p>}</footer>
  </div>
 </main>;
}
