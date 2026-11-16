import { cookies } from "next/headers";

/* After a failed sign-in the Employee ID the person typed comes back in the form, so only the password is retyped
 * (inspection Nov 14, 2026, PB-006). It rides in a short-lived HttpOnly cookie scoped to /login, never in the address.
 * It holds what was typed whether or not such an account exists, so it says nothing about any account; a successful
 * sign-in clears it. Presentation only: a missing or unreadable cookie just leaves the field empty, as before. */
const KEPT_ID_COOKIE = "nv-login-id";
const KEPT_ID_SECONDS = 300;
const keepable = (value: string) => value.length > 0 && value.length <= 128 && !/[\u0000-\u001f\u007f]/.test(value);
const scoped = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/login", maxAge });

/** Remember the typed ID for the sign-in page this action is about to return to. Never throws. */
export async function keepLoginId(typed: string) {
  try {
    const store = await cookies();
    if (keepable(typed)) store.set(KEPT_ID_COOKIE, typed, scoped(KEPT_ID_SECONDS));
    else if (store.get(KEPT_ID_COOKIE)) store.set(KEPT_ID_COOKIE, "", scoped(0));
  } catch { /* No cookie store: the field comes back empty. */ }
}

/** Forget it (a successful sign-in). Never throws. */
export async function clearLoginId() {
  try {
    const store = await cookies();
    if (store.get(KEPT_ID_COOKIE)) store.set(KEPT_ID_COOKIE, "", scoped(0));
  } catch { /* Nothing to clear. */ }
}

/** The ID to show again on the sign-in page after an error, or null. */
export async function readKeptLoginId(): Promise<string | null> {
  try {
    const value = (await cookies()).get(KEPT_ID_COOKIE)?.value ?? "";
    return keepable(value) ? value : null;
  } catch {
    return null;
  }
}
