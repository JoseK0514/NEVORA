import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children) }));
rs.mock("next/image", () => ({ default: () => null }));
rs.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
rs.mock("@/components/brand-mark", () => ({ BrandMark: () => null, BrandWordmark: () => null }));
rs.mock("@/app/app/account/delete/actions", () => ({ requestAccountDeletion: rs.fn() }));
rs.mock("@/app/login/actions", () => ({ logout: rs.fn() }));
import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";
import SupportPage from "./support/page";
import AccountDeletionPage from "./account-deletion/page";
import { AccountPrivacyLinks } from "@/components/legal/account-privacy-links";
import { BrandLegal } from "@/components/brand-legal";
import { AccountDeletionForm } from "@/components/account-deletion-form";
import { POLICY_FACTS } from "@/lib/legal/policies";

const language = rs.hoisted(() => ({ lang: "en" as "en" | "es" }));
rs.mock("@/lib/auth-lang.server", () => ({ readAuthLang: async () => language.lang }));
const pages = [["Privacy Policy", PrivacyPage], ["Terms of Use", TermsPage], ["Support", SupportPage], ["Delete your NEVORA account", AccountDeletionPage]] as const;
/** Support and Account deletion follow the sign-in language, so they are async server components (inspection Nov 14, 2026). */
const render = async (Page: () => unknown) => renderToStaticMarkup(await Page() as Parameters<typeof renderToStaticMarkup>[0]);
afterEach(() => { rs.unstubAllEnvs(); language.lang = "en"; });

describe("public policy pages", () => {
  it.each(pages)("%s reads without signing in, links the other pages and shows unresolved facts plainly", async (title, Page) => {
    const html = await render(Page);
    expect(html).toContain(`<h1 id="legal-title">${title}</h1>`);
    expect(html).toContain('href="mailto:support@thevelani.com"');
    // Phase 8: the operator is the first line of the footer every signed-out page shares.
    expect(html).toContain("VELANI LLC");
    for (const href of ["/privacy", "/terms", "/support", "/account-deletion"]) expect(html).toMatch(new RegExp(`href="${href}"|aria-current="page"`));
    // Every fact is confirmed, so no draft marker is left.
    expect(html).not.toContain("legal-unresolved");
    expect(html).not.toContain("CONFIRM_");
  });

  it("Support keeps the approved response commitment and mailing address word for word (Codex review, Oct 23)", async () => {
    const html = (await render(SupportPage)).replace(/’/g, "'");
    const fact = (key: string) => String(POLICY_FACTS[key]).replace(/’/g, "'");
    // “We aim to respond … two business days … public holidays observed in Puerto Rico … may take longer”, never a promise.
    expect(html).toContain(fact("SUPPORT_RESPONSE_TIME"));
    expect(html).toContain("We aim to respond");
    expect(html).toContain("excluding public holidays observed in Puerto Rico");
    expect(html).toContain("may take longer to resolve");
    expect(html).not.toMatch(/Reply within/i);
    expect(html).toContain(fact("BUSINESS_CONTACT_DETAILS"));
  });

  it("public Account deletion uses the Quiet legal layout like Privacy (inspection Oct 24)", async () => {
    const html = await render(AccountDeletionPage);
    expect(html).toContain('class="q-page q-auth q-doc"');
    expect(html).not.toContain("employee-login-submit");
  });

  it.each([["en", "How to delete your account and what happens to your records.", "Start deletion request", "If you can’t sign in"], ["es", "Cómo eliminar tu cuenta y qué pasa con tus registros.", "Iniciar solicitud de eliminación", "Si no puedes iniciar sesión"]] as const)(
    "Account deletion in %s: the action is an outlined pill in the card, under the how-to, never on the band (PB-024)", async (lang, sub, start, cannot) => {
    language.lang = lang;
    const html = await render(AccountDeletionPage);
    // The band: the title and what the page is for; no action on it.
    const band = html.slice(html.indexOf('class="q-hd q-doc__hd"'), html.indexOf('class="pl-body"'));
    expect(band).toContain(`<p>${sub}</p>`);
    expect(band).not.toMatch(/<a |<button /);
    expect(html).not.toMatch(/q-doc__action|q-doc__start/);
    // The card: the how-to is always open with a plain heading, the path for someone who cannot sign in is in it, and the
    // action closes it.
    const first = html.slice(html.indexOf('id="legal-section-1"'), html.indexOf('id="legal-section-2"'));
    expect(first).toMatch(/<h2 class="pl-sec__h" id="legal-section-1-title">[^<]+<\/h2>/);
    expect(first).not.toContain("hidden");
    expect(first).toContain(cannot);
    expect(first).toContain('href="/forgot-access"');
    expect(first).toContain('href="mailto:support@thevelani.com"');
    expect(first.indexOf(cannot)).toBeLessThan(first.indexOf("pl-start__btn"));
    expect(first).toMatch(new RegExp(`<p class="pl-start"><a (?=[^>]*class="pl-start__btn")(?=[^>]*href="/login\\?returnTo=%2Fapp%2Faccount%2Fdelete")[^>]*>${start}</a></p>`));
    expect(html.match(/pl-start__btn/g)).toHaveLength(1);
    // Every policy section is still there, each a real heading.
    expect(html.match(/<h2 class="pl-sec__h"/g)).toHaveLength(5);
  });

  it.each([["Privacy Policy", PrivacyPage, 12, "In this policy", "En esta política", "Política de privacidad"], ["Terms of Use", TermsPage, 10, "In these terms", "En estos términos", "Términos de uso"]] as const)(
    "%s keeps its English text; in Spanish only the page around it changes and one note says so (PB-001, PB-034)", async (title, Page, count, tocEn, tocEs, titleEs) => {
    const en = await render(Page);
    language.lang = "es";
    const es = await render(Page);
    // The document is the same in both: the title, every heading and every paragraph, marked as English.
    const doc = (html: string) => html.slice(html.indexOf('<article lang="en"'), html.indexOf("</article>")).replace(/>Open all<|>Abrir todo</, "><");
    expect(doc(es)).toBe(doc(en));
    // Phase 8: on a Spanish page the title, the date line and the summary are Spanish; the date never splits.
    expect(en).toContain(`<h1 id="legal-title">${title}</h1>`);
    expect(es).toContain(`<h1 id="legal-title">${titleEs}</h1>`);
    expect(en).toContain("<p>Effective October\u00A020,\u00A02026</p>");
    expect(es).toContain("<p>Vigente desde el 20\u00A0de\u00A0octubre\u00A0de\u00A02026</p>");
    expect(es).not.toMatch(/Effective|VELANI LLC<\/p>|Privacy Policy<\/h1>|Terms of Use<\/h1>/);
    expect(es).toMatch(/<p class="q-sr">(Cómo NEVORA maneja|Las reglas para usar NEVORA)/);
    expect(doc(en).match(/<h2 class="pl-sec__h"/g)).toHaveLength(count);
    // English: no note. Spanish: one note at the top, with the help address. Phase 9: the kit's teal callout, the fact as
    // its one-line title, the help path as its body and the address as its one link, which wraps only after "@".
    expect(en).not.toContain("b-callout");
    expect(es.match(/class="b-callout"/g)).toHaveLength(1);
    expect(es).toContain('<div class="b-callout" data-tone="teal"><span class="b-callout__ic" aria-hidden="true"><svg');
    expect(es).toContain('<p class="b-callout__t">Este documento está solo en inglés</p>');
    expect(es).toContain('<div class="b-callout__b">Si necesitas ayuda para entenderlo, escribe a <a href="mailto:support@thevelani.com">support@<wbr/>thevelani.com</a>.</div>');
    expect(es.indexOf("b-callout")).toBeLessThan(es.indexOf("<article"));
    // The page around it: language pill, back link, contents label, the open control and the closing links.
    expect(en).toMatch(/<button type="button" class="q-auth__lang" lang="es"[^>]*>Español<\/button>/);
    expect(es).toMatch(/<main class="q-page q-auth q-doc"[^>]*lang="es"/);
    expect(es).toMatch(/<button type="button" class="q-auth__lang" lang="en"[^>]*>English<\/button>/);
    expect(es).toMatch(/class="q-nav__l q-auth__back q-auth__back--row"[^>]*>.*?Iniciar sesión<\/a>/);
    expect(es.match(/class="q-nav__l q-auth__back/g)).toHaveLength(1);
    expect(en).toContain(`<h2 id="legal-toc-title">${tocEn}</h2>`);
    expect(es).toContain(`<h2 id="legal-toc-title">${tocEs}</h2>`);
    expect(en).toContain(">Open all</button>");
    expect(es).toContain(">Abrir todo</button>");
    expect(es).toContain('<nav class="so-foot__links" aria-label="Políticas y ayuda">');
    expect(es.match(/class="so-foot"/g)).toHaveLength(1);
    expect(es).toContain('href="/support">Ayuda</a>');
    expect(es).not.toContain("(en inglés)");
    // The contents list names every section and, on Privacy, Questions (PB-034).
    const toc = en.slice(en.indexOf('class="pl-toc"'), en.indexOf("</nav>", en.indexOf('class="pl-toc"')));
    expect(toc.match(/<a href="#legal-/g)).toHaveLength(count + (title === "Privacy Policy" ? 1 : 0));
    // The list is the document's own English headings; in Spanish "Preguntas" is the Spanish section after it, not an entry.
    if (title === "Privacy Policy") { expect(toc).toContain('<a href="#legal-questions">Questions</a>'); expect(en).toContain('id="legal-questions"'); expect(es).not.toContain('<a href="#legal-questions">'); expect(es).toContain('id="legal-questions-title">Preguntas</h2>'); }
  });

  it("Support's safety note is a titled callout at the top of the Email support card (Phase 9)", async () => {
    const html = await render(SupportPage);
    const card = html.slice(html.indexOf('<div class="q-doc__card">'), html.indexOf('<p class="q-help q-doc__promise">'));
    expect(card).toMatch(/^<div class="q-doc__card"><div class="b-callout" data-tone="teal"><span class="b-callout__ic" aria-hidden="true"><svg[^>]*>[\s\S]*?<\/svg><\/span><p class="b-callout__t">Keep private details out of email<\/p><div class="b-callout__b">Never email passwords, codes, bank\u00a0details or pay documents.<\/div><\/div><ul class="q-list"><li><a class="q-row" href="mailto:support@thevelani.com">/);
    expect(html).not.toContain("q-doc__note");
    expect(html.match(/class="b-callout"/g)).toHaveLength(1);
  });

  it("Support's group headings are real headings that label their groups (PB-033)", async () => {
    const html = await render(SupportPage);
    expect(html).toContain('<h2 class="pl-grp" id="support-common">Common questions</h2><ul class="q-list" aria-labelledby="support-common">');
    expect(html).toContain('<h2 class="pl-grp">Mailing address</h2><p class="q-body q-doc__address">');
    // Every common question is one line: none carries a sub-line (Phase 8).
    expect(html).not.toContain('Ask your manager</i>');
    expect(html).not.toContain("q-grp");
  });

  it("starts deletion by signing in, never by typing an email address", async () => {
    const html = await render(AccountDeletionPage);
    expect(html).toContain('href="/login?returnTo=%2Fapp%2Faccount%2Fdelete"');
    expect(html).not.toMatch(/<input[^>]*type="email"/);
  });

  it.each(pages)("%s is published in production now that every fact is confirmed", async (title, Page) => {
    rs.stubEnv("VERCEL_ENV", "production");
    expect(await render(Page)).toContain(`<h1 id="legal-title">${title}</h1>`);
  });

  it("Support and Account deletion read in Spanish with the language switch; Privacy and Terms say they are in English (PB-001)", async () => {
    language.lang = "es";
    const support = await render(SupportPage), deletion = await render(AccountDeletionPage);
    for (const html of [support, deletion]) {
      expect(html).toMatch(/<main class="q-page q-auth q-doc"[^>]*lang="es"/);
      expect(html).toMatch(/<button type="button" class="q-auth__lang" lang="en"[^>]*>English<\/button>/);
      // Phase 5: the closing links no longer carry "(en inglés)"; Privacy and Terms say it themselves, once, at the top.
      for (const link of ['href="/privacy">Privacidad</a>', 'href="/terms">Términos</a>']) expect(html).toContain(link);
      expect(html).not.toContain("(en inglés)");
      expect(html).toContain('href="mailto:support@thevelani.com"');
      expect(html).not.toContain("CONFIRM_");
    }
    for (const text of ['<h1 id="legal-title">Ayuda</h1>', "Preguntas frecuentes", "dos días laborables", "Datos privados fuera del correo", "Nunca envíes por correo contraseñas, códigos, datos\u00a0bancarios ni documentos de pago.", '<span aria-current="page">Ayuda</span>', 'href="/account-deletion">Eliminar cuenta</a>', String(POLICY_FACTS.BUSINESS_CONTACT_DETAILS)]) expect(support).toContain(text);
    expect(support).not.toMatch(/We aim to respond|Common questions|>Sign in</);
    for (const text of ['<h1 id="legal-title">Elimina tu cuenta de NEVORA</h1>', ">Iniciar solicitud de eliminación</a>", 'href="/login?returnTo=%2Fapp%2Faccount%2Fdelete"', "30 días calendario", "DEL-7KQ2M9XA", '<span aria-current="page">Eliminar cuenta</span>', 'href="/support">Ayuda</a>']) expect(deletion).toContain(text);
    expect(deletion).not.toMatch(/Start deletion request|What happens next/);
    // English keeps the switch too, offering Spanish.
    language.lang = "en";
    for (const Page of [SupportPage, AccountDeletionPage]) expect(await render(Page)).toMatch(/<button type="button" class="q-auth__lang" lang="es"[^>]*>Español<\/button>/);
  });

  it("the sign-in footer and Profile link the policies and Delete my account in production", () => {
    rs.stubEnv("VERCEL_ENV", "production");
    expect(renderToStaticMarkup(createElement(BrandLegal))).toContain('href="/privacy"');
    expect(renderToStaticMarkup(createElement(AccountPrivacyLinks))).toContain('href="/app/account/delete"');
  });

  it("the sign-in footer names the links in Spanish; the employee Profile draws them as Settings rows", () => {
    const es = renderToStaticMarkup(createElement(BrandLegal, { lang: "es" }));
    for (const text of ['aria-label="Políticas y ayuda"', /* Phase 5 (PB-018): the pages say they are in English, not the footer */">Privacidad</a>", ">Términos</a>", ">Ayuda</a>", "© 2026 VELANI LLC. Todos los derechos reservados."]) expect(es).toContain(text);
    const rows = renderToStaticMarkup(createElement(AccountPrivacyLinks, { variant: "settings", sectionClassName: "sig", headingClassName: "sig-h" }));
    expect(rows).toContain('class="profile-settings account-privacy sig"');
    expect(rows).toContain('<h2 id="account-privacy-title" class="sig-h">Privacy and your account</h2>');
    expect(rows.match(/class="profile-setting-row"/g)).toHaveLength(4);
    expect(rows).toContain('href="/app/account/delete"');
  });
});

describe("Delete my account", () => {
  const account = { name: "Fictional Person", role: "Employee", employeeId: "FICTIONAL-E1" };
  // Phase 2 (Nov 23, 2026): every role gets the Employee's Direction B screen (employee-mobile/deletion.tsx).
  it("says what is deleted and kept, then asks for the password before the destructive action", () => {
    const html = renderToStaticMarkup(createElement(AccountDeletionForm, { account, period: null, retention: null, existing: null }));
    for (const text of ["What we delete", "Your access ends right away", "What may be kept", "Delete my account", "This can’t be undone.", "Confirm it’s you"]) expect(html).toContain(text);
    expect(html).toContain('name="account" value="FICTIONAL-E1"');
    expect(html).toMatch(/<input[^>]*type="password"[^>]*autoComplete="current-password"|<input[^>]*autoComplete="current-password"[^>]*type="password"/);
    // Phase 8 (review B, row 4; DESIGN.MD B6): a working red pill from the start; the consent box is checked in the page
    // before anything is sent, so the button is never drawn disabled at rest.
    expect(html).toMatch(/<button type="submit" class="c-btn c-btn--danger c-btn--full em-delete-confirm">Delete my account<\/button>/);
    expect(html).toContain('id="deletion-understand"');expect(html).not.toContain('placeholder="Password"');
    expect(html).toContain("[CONFIRM_DELETION_COMPLETION_PERIOD]");
    expect(html).toContain("I understand my NEVORA account will be deleted and I won’t be able to sign in again.");
  });

  it("gives an Owner the same screen with the workspace sentence and the public policy", () => {
    const html = renderToStaticMarkup(createElement(AccountDeletionForm, { account: { ...account, role: "Owner", roleKey: "OWNER" as const }, period: "Confirmed period", retention: null, existing: null, owner: true }));
    expect(html).toContain("em-delete--team");
    expect(html).toContain("Your company’s workspace stays open for the rest of your team.");
    expect(html).toContain('href="/account-deletion"');
    expect(html).toContain('href="/app/profile#profile-privacy"');
    expect(html).not.toMatch(/q-deletion|q-row/);
  });

  it("shows an open request with its reference instead of a second form", () => {
    const html = renderToStaticMarkup(createElement(AccountDeletionForm, { account, period: "Confirmed period", retention: null,
      existing: { kind: "duplicate", reference: "DEL-7KQ2M9XA", confirmedAt: "2030-01-01" } }));
    expect(html).toContain("A deletion request is already in progress");
    expect(html).toContain("DEL-7KQ2M9XA");
    expect(html).toContain("Confirmed period");
    expect(html).not.toContain("em-delete-confirm");
  });
});
