import Link from "next/link";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { FileTextIcon } from "@phosphor-icons/react/dist/ssr/FileText";
import { LifebuoyIcon } from "@phosphor-icons/react/dist/ssr/Lifebuoy";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { policiesVisible } from "@/lib/legal/policies";

const rows = [
  { href: "/privacy", title: "Privacy Policy", meta: "How NEVORA handles your information", Icon: ShieldCheckIcon },
  { href: "/terms", title: "Terms of Use", meta: "The rules for using NEVORA", Icon: FileTextIcon },
  { href: "/support", title: "Support", meta: "Get help from NEVORA", Icon: LifebuoyIcon },
  { href: "/app/account/delete", title: "Delete my account", meta: "Ask us to delete your NEVORA account", Icon: TrashIcon },
] as const;

/** Profile, every role: the policies, support and Delete my account. Hidden while the policies are unpublished.
 * `settings` draws it like the employee Profile's Settings list (Signature); the default is the kit card. */
export function AccountPrivacyLinks({ variant = "card", sectionClassName = "", headingClassName = "" }: {
  variant?: "card" | "settings" | "quiet"; sectionClassName?: string; headingClassName?: string;
}) {
  if (!policiesVisible()) return null;
  // Quiet (v4): one "Privacy and terms" row that opens to the policies, Support and Delete my account.
  if (variant === "quiet") return (
    <li><details className="q-details account-privacy" id="profile-privacy"><summary className="q-row q-row--one"><span className="q-rt"><b>Privacy and terms</b></span><CaretDownIcon className="q-chev q-chev--down" weight="bold" aria-hidden="true" /></summary>
      <ul className="q-list">{rows.map(row => <li key={row.href}><Link className="q-row q-row--one" href={row.href} prefetch={false} style={{ paddingLeft: 36 }}>
        <span className="q-rt"><b>{row.title}</b></span><CaretRightIcon className="q-chev" aria-hidden="true" /></Link></li>)}</ul>
    </details></li>
  );
  if (variant === "settings") return (
    <section className={`profile-settings account-privacy ${sectionClassName}`} aria-labelledby="account-privacy-title">
      <h2 id="account-privacy-title" className={headingClassName}>Privacy and your account</h2>
      <div className="profile-settings-list">
        {rows.map(({ href, title, meta, Icon }) => (
          <Link key={href} className="profile-setting-row" href={href} prefetch={false}>
            <span className="profile-setting-copy"><Icon size={20} aria-hidden="true" /><span><strong>{title}</strong><small>{meta}</small></span></span>
            <CaretRightIcon className="profile-setting-caret" size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
  return (
    <section className="nv-card account-privacy" aria-labelledby="account-privacy-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="account-privacy-title">Privacy and your account</h2></div>
      <ul className="nv-rows">
        {rows.map(row => (
          <li key={row.href}>
            <Link className="nv-row" href={row.href} prefetch={false}>
              <span className="nv-row__text"><span className="nv-row__title">{row.title}</span><span className="nv-row__meta">{row.meta}</span></span>
              <CaretRightIcon className="nv-row__chev" size={18} weight="bold" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
