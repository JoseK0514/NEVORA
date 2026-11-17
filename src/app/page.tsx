import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

/* The bare domain (Phase 5, Nov 17, 2026, PB-010): sign-in is the front door. A visitor whose browser presents no
 * session cookie goes straight to /login in one hop; before, "/" went to /app, which sent them on to /login. Any
 * presented cookie still goes to /app, which alone decides whether that session is valid (and says so calmly on the
 * sign-in page when it is not). Presentation only: this reads whether a cookie is there, never what it holds, and
 * opens nothing that /login and /app do not already serve. The name is the session cookie's own (src/lib/auth/session-cookie.ts). */

export default async function Home() {
  let presented = false;
  try { presented = Boolean((await cookies()).get(SESSION_COOKIE)?.value); } catch { /* No cookie store: treat as signed out. */ }
  redirect(presented ? "/app" : "/login");
}
