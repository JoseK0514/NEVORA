// U11 (Nov 17, 2026): passkey guidance and states, English and Spanish. The WebAuthn calls and their server verification
// are not touched (src/lib/passkeys/client.test.ts and the passkey integration tests guard them).
import { describe, expect, it } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";
import { PasskeySignInView, PasskeySlot, PasskeyUnsupported } from "./passkey-slot";
import { PasskeyDesktopView } from "@/components/passkeys/passkey-desktop-view";
import { ACCESS_COPY } from "@/components/access-recovery/copy";
import { AUTH_COPY } from "@/lib/auth-copy";
import type { PasskeyError } from "@/lib/passkeys/client";

type Lang = "en" | "es";
const signIn = (lang: Lang, props: { busy?: boolean; error?: PasskeyError | null; cancelled?: boolean; phone?: boolean } = {}) =>
  renderToStaticMarkup(<PasskeySignInView t={AUTH_COPY[lang]} lang={lang} phone={props.phone ?? false} busy={props.busy ?? false} error={props.error ?? null} cancelled={props.cancelled ?? false} />);
const KEY = { id: "11111111-1111-4111-8111-111111111111", name: "Mac", createdAt: "2026-11-01T12:00:00Z", lastUsedAt: null };
const profile = (lang: Lang, props: Partial<Parameters<typeof PasskeyDesktopView>[0]> = {}) => renderToStaticMarkup(<PasskeyDesktopView lang={lang} load="ready" passkeys={[]} busy={null} notice={null} confirm={null} supported phone={false}
  dialog={{ current: null }} addButton={{ current: null }} onRefresh={() => {}} onAdd={() => {}} onReview={() => {}} onRemove={() => {}} onKeep={() => {}} {...props} />);

it("the server render shows nothing about passkeys (the device is not known yet)", () => {
  expect(renderToStaticMarkup(<PasskeySlot t={AUTH_COPY.en} quiet />)).toBe("");
});

describe.each(["en", "es"] as const)("passkey sign-in in %s", lang => {
  const t = AUTH_COPY[lang], a = ACCESS_COPY[lang].passkey;

  it("offered: the button and one plain line that says what a passkey is", () => {
    const html = signIn(lang);
    expect(html).toContain(t.passkeyDesktop);
    expect(html).toContain(`<p class="q-passkey__what" id="passkey-what">${a.what}</p>`);
    expect(html).toContain('aria-describedby="passkey-what"');
    expect(html).not.toContain('role="alert"');
    expect(signIn(lang, { phone: true })).toContain(t.passkeyPhone);
  });

  it("waiting on the device: busy, announced, no result yet", () => {
    const html = signIn(lang, { busy: true, cancelled: true });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(`<span class="q-sr" role="status" aria-live="polite">${t.passkeyBusyDesktop}</span>`);
    expect(html).not.toContain(a.cancelledSignIn);
  });

  it("prompt closed: said calmly as a status, not an error, and nothing changed", () => {
    const html = signIn(lang, { cancelled: true });
    expect(html).toContain(`<p class="q-passkey__note" role="status"><span>${a.cancelledSignIn}</span></p>`);
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain("data-tone");
  });

  it("a passkey the server did not accept (removed, or none for NEVORA on this device): what happened, how to get back in, and the recovery link", () => {
    // The server answers not_found for every refusal of this kind, so the words claim no single cause.
    expect(a.staleNext).toMatch(lang === "en" ? /may not have a passkey.*may have been removed/ : /Puede que.*no tenga.*se haya quitado/);
    const html = signIn(lang, { error: "not_found" });
    expect(html).toContain(`<div class="q-passkey__note" id="passkey-error" role="alert" data-tone="wait"><b>${a.stale}</b><span>${a.staleNext}</span>`);
    expect(html).toMatch(new RegExp(`<a class="q-link" href="/forgot-access">${a.forgot.replace("?", "\\?")}</a>`));
    expect(html).toContain('aria-describedby="passkey-error passkey-what"');
  });

  it.each([["rate_limited", "wait"], ["unavailable", "stop"], ["not_supported", "stop"]] as const)("%s: the reason, then that the password still works", (error, tone) => {
    const html = signIn(lang, { error });
    expect(html).toContain(`data-tone="${tone}"`);
    expect(html).toContain(error === "rate_limited" ? t.passkeyRateLimited : t.passkeyUnavailableDesktop);
    expect(html).toContain(a.backBody);
    expect(html).toContain('href="/forgot-access"');
  });

  it("an account that can't sign in: no recovery route is offered (it would not help)", () => {
    const html = signIn(lang, { error: "account_disabled" });
    expect(html).toContain(t.passkeyAccountDisabled);
    expect(html).not.toContain("/forgot-access");
  });

  it("this device can't use a passkey: an honest line in the button's place", () => {
    const html = renderToStaticMarkup(<PasskeyUnsupported lang={lang} />);
    expect(html).toBe(`<div class="q-passkey q-passkey--none"><p class="q-passkey__note"><b>${a.unsupported}</b><span>${a.unsupportedNext}</span></p></div>`);
    expect(html).not.toContain("<button");
  });
});

it("Spanish passkey sign-in shows no English", () => {
  for (const html of [signIn("es"), signIn("es", { cancelled: true }), signIn("es", { error: "not_found" }), signIn("es", { error: "unavailable" }), renderToStaticMarkup(<PasskeyUnsupported lang="es" />)])
    expect(html.replace(/<[^>]+>/g, " ")).not.toMatch(/passkey|password|Sign in|device|cancelled|Nothing/i);
});

describe.each(["en", "es"] as const)("passkey guidance in Profile, %s", lang => {
  const a = ACCESS_COPY[lang].passkey;

  it("none yet: what a passkey is and that the face or fingerprint stays on the device", () => {
    const html = profile(lang);
    expect(html).toContain(`<p class="pk-muted pk-what"><b>${a.what}</b><span>${a.private}</span></p>`);
  });

  it("this device can't use a passkey: says so, with what still works; saved ones can still be removed", () => {
    const none = profile(lang, { supported: false });
    expect(none).toContain(`<b>${a.unsupported}</b><span>${a.unsupportedNext}</span>`);
    expect(none).not.toContain("pk-add");
    const saved = profile(lang, { supported: false, passkeys: [KEY] });
    expect(saved).toContain(a.unsupportedManage);
    expect(saved).toContain("pk-remove");
  });

  it("prompt closed: \"No passkey was added\" is a status in the information tone, not an error", () => {
    const html = profile(lang, { notice: { tone: "info", text: a.cancelledAdd } });
    expect(html).toContain(`<p class="pk-notice" data-tone="info" role="status">${a.cancelledAdd}</p>`);
    expect(html).not.toContain('role="alert"');
  });

  it("added: a green status; with a saved passkey, removing is explained", () => {
    const html = profile(lang, { passkeys: [KEY], notice: { tone: "done", text: a.added } });
    expect(html).toContain(`<p class="pk-notice" data-tone="done" role="status">${a.added}</p>`);
    expect(html).toContain(a.removeKeeps);
  });
});
