"use client";

import { AUTH_LANG_COOKIE, type AuthLang } from "@/lib/auth-copy";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const hydrated = () => true;
const server = () => false;

/** Store the choice for a year and reload so the server renders the page in it. A recovery code already filled in
 * on Set a new password is kept: the page reads it from #proof on load. */
export function switchTo(next: AuthLang) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_LANG_COOKIE}=${next}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
  const proof = document.getElementById("reset-proof");
  if (proof instanceof HTMLInputElement && proof.value.trim()) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#proof=${encodeURIComponent(proof.value.trim())}`);
  }
  window.location.reload();
}

/** English / Español for the four sign-in pages (on for development, per Jose). Each option names itself in its own
 * language; the pressed one is the language shown. */
export function LangSwitch({ lang, label, quiet = false }: { lang: AuthLang; label: string; /** Quiet (v4): one link naming the other language. */ quiet?: boolean }) {
  const ready = useSyncExternalStore(subscribe, hydrated, server);
  if (quiet) {
    const next: AuthLang = lang === "es" ? "en" : "es";
    return <button type="button" className="q-auth__lang" lang={next} disabled={!ready} aria-label={`${label}: ${next === "es" ? "Español" : "English"}`} onClick={() => switchTo(next)}>{next === "es" ? "Español" : "English"}</button>;
  }
  return (
    <div className="ap-lang" role="group" aria-label={label}>
      {([["en", "English", "EN"], ["es", "Español", "ES"]] as const).map(([value, long, short]) => (
        <button key={value} type="button" lang={value} disabled={!ready} aria-pressed={lang === value} aria-label={long} onClick={() => { if (value !== lang) switchTo(value); }}>
          <span className="ap-lang__long" aria-hidden="true">{long}</span>
          <span className="ap-lang__short" aria-hidden="true">{short}</span>
        </button>
      ))}
    </div>
  );
}
