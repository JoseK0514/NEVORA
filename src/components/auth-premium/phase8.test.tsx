import { createElement, type ComponentProps } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from "@rstest/core";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";

rs.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ usePathname: () => "/login" }));

import { AUTH_COPY } from "@/lib/auth-copy";
import { ACCESS_COPY } from "@/components/access-recovery/copy";
import { MOBILE_ACCESS_COPY } from "@/components/mobile-access/copy";
import { PasswordPair } from "@/components/access-recovery/password-pair";
import { POLICY_COPY, effectiveLine, policyDate } from "@/components/legal/policy-copy";
import { ActivationInvitationView } from "@/app/activate/activation-invitation";
import { PasswordInput } from "./password-input";
import { SignedOutFooter } from "./signed-out-footer";
import { PublicErrorScreen } from "@/components/public-error-screen";

/* Phase 8 (Nov 17, 2026), review D of the final verification: the signed-out pages say one thing one way. */
const LANGS = ["en", "es"] as const;
const css = readFileSync("src/components/auth-premium/auth-b.css", "utf8");
const footCss = readFileSync("src/components/auth-premium/signed-out-footer.css", "utf8");
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const strings = (value: unknown): string[] => typeof value === "string" ? [value]
  : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];

describe("one name for setting up an account (row 1)", () => {
  it.each(LANGS)("no sentence a person reads on the signed-out pages says activate, in %s", lang => {
    const read = [...strings(AUTH_COPY[lang]), ...strings(ACCESS_COPY[lang]), ...strings(MOBILE_ACCESS_COPY[lang])];
    // "Activa JavaScript" is the browser setting, and an "active account" is not the setup step.
    const offending = read.filter(line => /activ/i.test(line) && !/Activa JavaScript|lo tenga activado|active account|cuenta activa/i.test(line));
    expect(offending).toEqual([]);
    expect(AUTH_COPY[lang].alreadyActivated).toBe(lang === "en" ? "Already set up? Sign in" : "¿Ya configuraste tu cuenta? Inicia sesión");
    expect(MOBILE_ACCESS_COPY[lang].alreadyActivated).toBe(AUTH_COPY[lang].alreadyActivated);
  });
  it.each(LANGS)("one finish title, in %s", lang => {
    expect(MOBILE_ACCESS_COPY[lang].activatedTitle).toBe(ACCESS_COPY[lang].activation.doneTitle);
  });
  it.each(LANGS)("without an invitation the band carries the title alone and the card says where the link is, in %s", lang => {
    const html = renderToStaticMarkup(createElement(ActivationInvitationView, { phase: "missing", lang, loginHref: "/login", onSubmit: () => {} }));
    const band = html.slice(0, html.indexOf("</div>") + 6);
    expect(band).toMatch(/^<div class="q-hd"><h1>[^<]+<\/h1><\/div>$/);
    expect(text(html)).toContain(ACCESS_COPY[lang].activation.missingHow);
    expect(html).toContain(`>${AUTH_COPY[lang].alreadyActivated}</a>`);
  });
});

describe("one eye convention (row 4)", () => {
  const eye = renderToStaticMarkup(createElement(EyeIcon, { size: 20, weight: "bold", "aria-hidden": "true", focusable: "false" }));
  const slash = renderToStaticMarkup(createElement(EyeSlashIcon, { size: 20, weight: "bold", "aria-hidden": "true", focusable: "false" }));
  it.each(LANGS)("a hidden password shows the open eye with the name Show password on Sign in, Reset and Set up, in %s", lang => {
    const t = AUTH_COPY[lang];
    const signIn = renderToStaticMarkup(createElement(PasswordInput, { id: "login-password", showLabel: t.showPassword, quiet: true }));
    for (const prefix of ["reset", "activation"] as const) {
      const pair = renderToStaticMarkup(createElement(PasswordPair, { prefix, lang, newLabel: t.newPassword, confirmLabel: t.quiet.confirmPassword }));
      expect(pair.split(eye)).toHaveLength(3);
      expect(pair).not.toContain(slash);
      expect(pair.match(new RegExp(`aria-label="${t.showPassword}"`, "g"))).toHaveLength(2);
    }
    expect(signIn).toContain(eye);
    expect(signIn).not.toContain(slash);
    expect(signIn).toContain(`aria-label="${t.showPassword}"`);
    expect(t.showPassword).toBe(lang === "en" ? "Show password" : "Mostrar contraseña");
  });
});

describe("one footer (row 6)", () => {
  it.each([["en", "Privacy Terms Support Account deletion"], ["es", "Privacidad Términos Ayuda Eliminar cuenta"]] as const)("one set of names, the owner first, in %s", (lang, names) => {
    const html = renderToStaticMarkup(createElement(SignedOutFooter, { lang, deletion: true, current: "support" }));
    expect(text(html.replace(/<span class="so-foot__dot" aria-hidden="true">·<\/span>/g, ""))).toMatch(new RegExp(`^© 2026 VELANI LLC ${names}`));
    // Each separator belongs to the link after it and is hidden from assistive technology.
    expect(html.match(/<span class="so-foot__item"><span class="so-foot__dot" aria-hidden="true">·<\/span>/g)).toHaveLength(4);
    expect(html).toContain('<span aria-current="page">');
    expect(renderToStaticMarkup(createElement(SignedOutFooter, { lang })).match(/class="so-foot__item"/g)).toHaveLength(3);
    // Z3 (A4-07): the English ownership line is marked as English, so a Spanish page doesn't read it as Spanish.
    expect(html).toContain('<span class="q-sr" lang="en"> NEVORA is a product of VELANI LLC.</span>');
  });
  it("ends the public error screen too, in place of its own \"Powered by\" line", () => {
    const html = renderToStaticMarkup(createElement(PublicErrorScreen, { reset: () => {} }));
    expect(html).toContain('<footer class="nf-foot"><div class="so-foot"><span class="so-foot__owner">© 2026 VELANI LLC</span>');
    expect(html).not.toContain("Powered by");
  });
  it("draws the dots only where the line fits, and the links on 44px rows on phones", () => {
    expect(footCss).toMatch(/@media \(max-width: 767px\) \{[^}]*\}[^@]*\.so-foot__dot \{ display: none; \}/);
    expect(footCss).toMatch(/\.so-foot__item \{ display: inline-flex; align-items: center; min-height: 44px; margin: 0 calc\(var\(--b-space-20, 20px\) \/ 2\); \}/);
    // Premium pass FD: the rows balance (two and two), so no link stands alone on a last row.
    expect(footCss).toMatch(/\.so-foot__links \{ display: block; max-width: 100%; text-align: center; text-wrap: balance; \}/);
  });
});

describe("the policy pages in Spanish (row 2)", () => {
  it("dates the document in the page's language and never splits the date", () => {
    expect(policyDate("es", "October 20, 2026")).toBe("20 de octubre de 2026");
    expect(effectiveLine("en", "October 20, 2026")).toBe("Effective October 20, 2026");
    expect(effectiveLine("es", "October 20, 2026")).toBe("Vigente desde el 20 de octubre de 2026");
    expect(effectiveLine("es", "Spring 2027")).toBe("Vigente desde el Spring 2027");
    expect(effectiveLine("en", null)).toBe("Effective [CONFIRM_EFFECTIVE_DATE]");
  });
  it("the title and the tab agree in each language", () => {
    for (const lang of LANGS) for (const slug of ["privacy", "terms"] as const) expect(POLICY_COPY[lang].metaTitle[slug]).toBe(`${POLICY_COPY[lang].title[slug]} · NEVORA`);
  });
});

describe("the sheet's Phase 8 block", () => {
  it("keeps the way back on one line and on one edge with the card on phones and tablets (rows 3, 5, 14)", () => {
    expect(css).toMatch(/\.q-auth__back:not\(#p8a\):not\(#p8b\):not\(#p8c\):not\(#p8d\) \{ white-space: nowrap; \}/);
    expect(css).toMatch(/@media \(max-width: 1023px\) \{\n[^\n]*\.q-auth__top[^\n]*padding-left: 36px !important; padding-right: 36px !important; \}/);
  });
  it("gives the setup finish one way on, as the reset finish (item 7)", () => {
    // It sits one step above the block's header rules, which show the back row on phones and tablets.
    expect(css).toMatch(/:has\(:is\(\.ar-done, \.ar-done__mark, \.activation-success\)\) :is\(\.q-auth__back, \.ma-back\):not\(#p8a\):not\(#p8b\):not\(#p8c\):not\(#p8d\):not\(#p8e\) \{ display: none !important; \}/);
    expect(css).toMatch(/\.q-auth__nav--rows > \.q-auth__back--row:not\(#p8a\):not\(#p8b\):not\(#p8c\):not\(#p8d\) \{ display: inline-flex !important;/);
  });
  it("keeps the 'check your email' envelope teal and every mark a centred circle (row 24)", () => {
    expect(css).toMatch(/\.q-auth__mark \{ display: grid; place-items: center; width: 56px; height: 56px; margin: 0; border-radius: 50%; background: var\(--b-teal-50\); color: var\(--b-teal\); \}/);
    expect(css).toMatch(/\.ma-receipt-mark[^{]*\{ margin-left: auto !important; margin-right: auto !important; border-radius: 50% !important; background: var\(--b-teal-50\) !important; \}/);
    expect(css).not.toContain("#E3F1EF");
  });
});
