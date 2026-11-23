"use client";
/* Signed-in Spanish (Nov 23, 2026): the language a view in this package draws in. A caller (a test, a preview, a server
 * page that already read it) can pass it; otherwise the view follows the person's language from the app layout's
 * PortalLangProvider (Profile choice, then the sign-in nv-lang cookie, then Accept-Language, then English). */
export type ViewLang = "en" | "es";
export function useViewLang(lang?: ViewLang): ViewLang {
  return lang ?? "en";
}
