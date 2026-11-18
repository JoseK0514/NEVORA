import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { BrandWordmark } from "@/components/brand-mark";
import type { AuthCopy, AuthLang } from "@/lib/auth-copy";
import { LangSwitch } from "./lang-switch";

/** The way back on the signed-out pages (review B4, Nov 10, 2026, NV-318): one control everywhere, a bold caret and the
 * label at 15px/600; on a desktop sign-in page it is the white pill at the top left (auth-b.css). With `lang` it also
 * carries the wordmark (tablets) and the language switch, so no page loses them (NV-042).
 * Phase 5 (Nov 17, 2026, PB-021): on a phone the band reads as on Sign in, the wordmark at the left and the language
 * at the right, with the way back on a row of its own under them. That row is a second link so the keyboard order
 * matches what is seen at every width; auth-b.css shows exactly one of the two (the other is `display: none`, so it is
 * neither focusable nor announced).
 * Phase 8 (Nov 17, 2026): every signed-out page has one way back and one header. Phones and tablets read alike (the
 * wordmark and the language on the first row, the way back on its own row), and the policy pages, whose first row is
 * DocBrand, draw the same back row (`q-auth__back--row`) at every width; it never wraps. */
export function AuthBackNav({ href, label, lang, t }: { href: string; label: string; lang?: AuthLang; t?: AuthCopy }) {
  const back = (row: boolean) => <Link className={`q-nav__l q-auth__back${row ? " q-auth__back--row" : " q-auth__back--bar"}`} href={href}><CaretLeftIcon size={16} weight="bold" aria-hidden="true" />{label}</Link>;
  if (!lang || !t) return <div className="q-nav q-auth__nav q-auth__nav--back">{back(true)}</div>;
  return <div className="q-nav q-auth__nav q-auth__nav--rows">
    {back(false)}
    <span className="q-auth__wordmark q-auth__navmark"><BrandWordmark /></span>
    <LangSwitch lang={lang} label={t.langLabel} quiet />
    {back(true)}
  </div>;
}

/** The policy pages' white wordmark on the band, back to sign in (NV-200). With `lang` (Support and Account deletion,
 * inspection Nov 14, 2026, PB-001) the language switch sits on the same row, as on the sign-in pages. */
export function DocBrand({ lang, langLabel }: { lang?: AuthLang; langLabel?: string }) {
  return <header className="q-auth__top q-doc__top"><Link href="/login" className="q-auth__wordmark" aria-label={lang === "es" ? "NEVORA, iniciar sesión" : "NEVORA sign in"}><BrandWordmark /></Link>
    {lang && langLabel ? <LangSwitch lang={lang} label={langLabel} quiet /> : null}</header>;
}
