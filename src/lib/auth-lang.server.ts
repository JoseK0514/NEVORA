import { cookies } from "next/headers";
import { AUTH_LANG_COOKIE, isAuthLang, type AuthLang } from "./auth-copy";

/** The sign-in pages' language from the nv-lang cookie the switch sets; English when absent or unknown. */
export async function readAuthLang(): Promise<AuthLang> {
  try {
    const value = (await cookies()).get(AUTH_LANG_COOKIE)?.value;
    return isAuthLang(value) ? value : "en";
  } catch {
    return "en"; // Outside a request (tests, static rendering): English.
  }
}
