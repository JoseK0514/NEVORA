import type { AuthLang } from "@/lib/auth-copy";
import { SUPPORT_EMAIL } from "@/lib/legal/policies";

/* The words around the policy pages (Privacy, Terms, Support, Account deletion) in English and Spanish: the band, the
 * contents list, the open and close controls and the closing links (Phase 5, PB-001 and PB-034). The Privacy Policy and
 * the Terms themselves are legal text and stay in English until counsel reviews a translation; in Spanish the page says
 * so once, at the top (`englishOnly`). Spanish for Puerto Rico, in the sign-in pages' register. */
type PolicySlug = "privacy" | "terms" | "support" | "account-deletion";
type PolicyCopy = {
  back: string; openAll: string; closeAll: string; contents: Record<"privacy" | "terms", string>; onThisPage: string;
  questions: string; linksLabel: string; links: Record<PolicySlug, string>; metaTitle: Record<"privacy" | "terms", string>;
  /** Shown above a document that is not translated. English needs none. */
  englishOnly: { before: string; after: string } | null;
};

const en: PolicyCopy = {
  back: "Sign in", openAll: "Open all", closeAll: "Close all",
  contents: { privacy: "In this policy", terms: "In these terms" }, onThisPage: "On this page", questions: "Questions",
  linksLabel: "NEVORA policies and help",
  links: { privacy: "Privacy Policy", terms: "Terms of Use", support: "Support", "account-deletion": "Account deletion" },
  metaTitle: { privacy: "Privacy Policy · NEVORA", terms: "Terms of Use · NEVORA" },
  englishOnly: null,
};

const es: PolicyCopy = {
  back: "Iniciar sesión", openAll: "Abrir todo", closeAll: "Cerrar todo",
  contents: { privacy: "En esta política", terms: "En estos términos" }, onThisPage: "En esta página", questions: "Preguntas",
  linksLabel: "Políticas y ayuda de NEVORA",
  links: { privacy: "Privacidad", terms: "Términos", support: "Ayuda", "account-deletion": "Eliminar cuenta" },
  metaTitle: { privacy: "Privacidad · NEVORA", terms: "Términos · NEVORA" },
  englishOnly: { before: "Este documento está disponible solo en inglés por ahora. Si necesitas ayuda para entenderlo, escribe a ", after: "." },
};

export const POLICY_COPY: Record<AuthLang, PolicyCopy> = { en, es };
export const POLICY_HELP_EMAIL = SUPPORT_EMAIL;
