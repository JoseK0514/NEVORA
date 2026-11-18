import type { AuthLang } from "@/lib/auth-copy";
import { SUPPORT_EMAIL } from "@/lib/legal/policies";

/* The words around the policy pages (Privacy, Terms, Support, Account deletion) in English and Spanish: the band, the
 * contents list, the open and close controls (Phase 5, PB-001 and PB-034). The Privacy Policy and the Terms themselves
 * are legal text and stay in English until counsel reviews a translation; in Spanish the page says so once, at the top
 * (`englishOnly`). Spanish for Puerto Rico, in the sign-in pages' register.
 * Phase 8 (Nov 17, 2026): on a Spanish page the title, the tab, the date line under the title and the screen reader's
 * summary are Spanish too, and the tab and the title use the same name. The closing links are the signed-out footer's
 * (SignedOutFooter), one set of names on every page. */
type PolicyCopy = {
  back: string; openAll: string; closeAll: string; contents: Record<"privacy" | "terms", string>; onThisPage: string;
  questions: string; title: Record<"privacy" | "terms", string>; metaTitle: Record<"privacy" | "terms", string>;
  /** What the page is, for screen readers (the visible document is the English text). */
  summary: Record<"privacy" | "terms", string>;
  /** The line under the title: when the document took effect. `{date}` is the policy's own date, in this language. */
  effective: string;
  /** Shown above a document that is not translated. English needs none. */
  englishOnly: { before: string; after: string } | null;
};

const en: PolicyCopy = {
  back: "Sign in", openAll: "Open all", closeAll: "Close all",
  contents: { privacy: "In this policy", terms: "In these terms" }, onThisPage: "On this page", questions: "Questions",
  title: { privacy: "Privacy Policy", terms: "Terms of Use" },
  metaTitle: { privacy: "Privacy Policy · NEVORA", terms: "Terms of Use · NEVORA" },
  summary: { privacy: "How NEVORA handles information when you use it on the web or in its apps.", terms: "The rules for using NEVORA." },
  effective: "Effective {date}",
  englishOnly: null,
};

const es: PolicyCopy = {
  back: "Iniciar sesión", openAll: "Abrir todo", closeAll: "Cerrar todo",
  contents: { privacy: "En esta política", terms: "En estos términos" }, onThisPage: "En esta página", questions: "Preguntas",
  title: { privacy: "Política de privacidad", terms: "Términos de uso" },
  metaTitle: { privacy: "Política de privacidad · NEVORA", terms: "Términos de uso · NEVORA" },
  summary: { privacy: "Cómo NEVORA maneja la información cuando lo usas en la web o en sus aplicaciones.", terms: "Las reglas para usar NEVORA." },
  effective: "Vigente desde el {date}",
  englishOnly: { before: "Este documento está disponible solo en inglés por ahora. Si necesitas ayuda para entenderlo, escribe a ", after: "." },
};

export const POLICY_COPY: Record<AuthLang, PolicyCopy> = { en, es };
export const POLICY_HELP_EMAIL = SUPPORT_EMAIL;

const MONTHS = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
} as const;

/** The policy's effective date ("October 20, 2026", a policy fact) in the page's language, its words joined by
 * non-breaking spaces so a narrow screen never splits the date. A date in any other shape is shown as it is. */
export function policyDate(lang: AuthLang, english: string): string {
  const match = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec(english.trim());
  const month = match ? MONTHS.en.indexOf(match[1] as (typeof MONTHS.en)[number]) : -1;
  const words = match && month >= 0 && lang === "es" ? `${Number(match[2])} de ${MONTHS.es[month]} de ${match[3]}` : english.trim();
  return words.replace(/ /g, " ");
}

/** "Effective October 20, 2026" / "Vigente desde el 20 de octubre de 2026". */
export function effectiveLine(lang: AuthLang, english: string | null | undefined): string {
  return POLICY_COPY[lang].effective.replace("{date}", english ? policyDate(lang, english) : "[CONFIRM_EFFECTIVE_DATE]");
}
