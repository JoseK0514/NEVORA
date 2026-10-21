import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { policiesVisible } from "@/lib/legal/policies";

const rows = [
  { href: "/privacy", title: "Privacy Policy", meta: "How NEVORA handles your information" },
  { href: "/terms", title: "Terms of Use", meta: "The rules for using NEVORA" },
  { href: "/support", title: "Support", meta: "Get help from NEVORA" },
  { href: "/app/account/delete", title: "Delete my account", meta: "Ask us to delete your NEVORA account" },
] as const;

/** Profile, every role: the policies, support and Delete my account. Hidden while the policies are unpublished. */
export function AccountPrivacyLinks() {
  if (!policiesVisible()) return null;
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
