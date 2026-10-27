import Link from 'next/link';
import styles from './clocker-owner.module.css';
const items=[['devices','Tablets','/app/settings/clocker'],['pins','Employee PINs','/app/settings/clocker/pins'],['breaks','Breaks','/app/settings/breaks'],['recovery','Recovery','/app/clocker-recovery']] as const;
/** Presentation only; each destination enforces current Owner authority. */
export function ClockerOwnerNav({current}:{current:typeof items[number][0]}){
 return <nav className={styles.navigation} aria-label="Clocker controls">{items.map(([key,label,href])=><Link key={key} href={href} aria-current={key===current?'page':undefined}>{label}</Link>)}</nav>;
}
