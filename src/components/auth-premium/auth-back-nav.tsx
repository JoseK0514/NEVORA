import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { BrandWordmark } from "@/components/brand-mark";
import type { AuthCopy, AuthLang } from "@/lib/auth-copy";
import { LangSwitch } from "./lang-switch";

/** The way back on the signed-out pages (review B4, Nov 10, 2026, NV-318): one control everywhere, a bold caret and the
 * label at 15px/600; on a desktop sign-in page it is the white pill at the top left (auth-b.css). With `lang` it also
 * carries the wordmark (tablets) and the language switch, so no page loses them (NV-042). */
export function AuthBackNav({ href, label, lang, t }: { href: string; label: string; lang?: AuthLang; t?: AuthCopy }) {
  return <div className="q-nav q-auth__nav">
    <Link className="q-nav__l q-auth__back" href={href}><CaretLeftIcon size={16} weight="bold" aria-hidden="true" />{label}</Link>
    {lang && t ? <span className="q-auth__wordmark q-auth__navmark"><BrandWordmark /></span> : <span />}
    {lang && t ? <LangSwitch lang={lang} label={t.langLabel} quiet /> : <span />}
  </div>;
}

/** The policy pages' white wordmark on the band, back to sign in (NV-200). */
export function DocBrand() {
  return <header className="q-auth__top q-doc__top"><Link href="/login" className="q-auth__wordmark" aria-label="NEVORA sign in"><BrandWordmark /></Link></header>;
}
