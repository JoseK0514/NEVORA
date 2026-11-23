"use client";
/* Rondo's language (G98 signed-in Spanish, Nov 23, 2026). Every Rondo screen reads the person's language here: the
 * portal's (`usePortalLang`, the Profile choice, then the sign-in cookie, then the browser's, then English), unless a
 * caller sets it for a subtree (tests and previews). Strings live in each screen's `*-copy.ts` table. */
import { createContext, useContext, type ReactNode } from "react";
import type { Lang } from "./format";

// Until the shell's `usePortalLang` lands on the shared branch, the portal language reads as English.
const usePortalLang = (): Lang => "en";

const Override = createContext<Lang | null>(null);

/** Sets Rondo's language for everything inside (tests, previews). */
export function AdvisorLangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <Override.Provider value={lang}>{children}</Override.Provider>;
}

/** The language Rondo speaks to this person: "en" or "es". */
export function useAdvisorLang(): Lang {
  const set = useContext(Override);
  const portal = usePortalLang();
  return set ?? portal;
}
