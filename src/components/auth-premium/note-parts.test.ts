import { describe, expect, it } from "@rstest/core";
import { AUTH_COPY } from "@/lib/auth-copy";
import { NOTE_TITLE_MAX, noteParts } from "./note-parts";

// Premium pass FD (Nov 18, 2026): a note's bold title is a short first sentence that more text follows; anything else is
// all body text, word for word (final review D, row 17).
describe("noteParts", () => {
  it("a short first sentence with more after it is the title, without its period", () => {
    expect(noteParts(AUTH_COPY.en.loginBusy)).toEqual({ title: "Too many attempts", body: "For your safety, sign-in is paused for 15 minutes. If you forgot your password, you can reset it now." });
    expect(noteParts(AUTH_COPY.es.loginBusy).title).toBe("Demasiados intentos");
  });

  it("one sentence is all body, period kept", () => {
    expect(noteParts(AUTH_COPY.en.loginError)).toEqual({ title: null, body: AUTH_COPY.en.loginError.trim() });
    expect(noteParts(AUTH_COPY.es.loginError)).toEqual({ title: null, body: AUTH_COPY.es.loginError.trim() });
  });

  it("a first sentence longer than two title lines on a 320px phone stays in the body", () => {
    for (const lang of ["en", "es"] as const) {
      const parts = noteParts(AUTH_COPY[lang].loginDeleting);
      expect(parts.title).toBeNull();
      expect(parts.body).toBe(AUTH_COPY[lang].loginDeleting.trim());
    }
    const long = `${"x".repeat(NOTE_TITLE_MAX + 1)}. Then more.`;
    expect(noteParts(long)).toEqual({ title: null, body: long });
    const edge = `${"x".repeat(NOTE_TITLE_MAX)}. Then more.`;
    expect(noteParts(edge)).toEqual({ title: "x".repeat(NOTE_TITLE_MAX), body: "Then more." });
  });

  it("never drops or adds a word", () => {
    for (const lang of ["en", "es"] as const) for (const message of [AUTH_COPY[lang].loginBusy, AUTH_COPY[lang].loginReplace, AUTH_COPY[lang].activated, AUTH_COPY[lang].sessionEnded, AUTH_COPY[lang].sessionEndedReturn]) {
      const { title, body } = noteParts(message);
      expect([title ? `${title}.` : null, body].filter(Boolean).join(" ")).toBe(message.trim());
    }
    expect(noteParts("")).toEqual({ title: null, body: null });
  });
});
