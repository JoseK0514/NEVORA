import { cookies, headers } from "next/headers";
import { AUTH_LANG_COOKIE, isAuthLang, preferredAuthLang, type AuthLang } from "./auth-copy";

/** The sign-in pages' language. The nv-lang cookie the switch sets always wins; on a first visit with no cookie the
 * browser's Accept-Language decides (Spanish when it ranks ahead of English; inspection Nov 14, PB-020); English otherwise. */
export async function readAuthLang(): Promise<AuthLang> {
  try {
    const value = (await cookies()).get(AUTH_LANG_COOKIE)?.value;
    if (isAuthLang(value)) return value;
    return preferredAuthLang((await headers()).get("accept-language"));
  } catch {
    return "en"; // Outside a request (tests, static rendering): English.
  }
}
