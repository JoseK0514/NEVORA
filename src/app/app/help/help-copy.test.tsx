// Signed-in Spanish (es-rest): Help's frame and reply-time note follow the person's language.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, rs } from '@rstest/core';

const fixture = rs.hoisted(() => ({ role: "OWNER", lang: "es" }));
rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ usePathname: () => "/app/help", useRouter: () => ({ refresh: () => undefined }) }));
rs.mock("@/lib/auth/session", () => ({ requireSession: async () => ({ id: "fictional", role: fixture.role, firstName: "Ana", lastName: "Colón" }),
  requireSessionMutationProof: async () => ({ employee: { id: "fictional", role: fixture.role }, sessionTokenHash: "a".repeat(64) }) }));
rs.mock("@/lib/payroll/service", () => ({ payrollFeatureEnabled: () => false, readPayrollCapabilities: async () => undefined }));
rs.mock("@/lib/workspace-presentation/current.server", () => ({ currentBrand: async () => ({ words: "standard", modules: undefined }) }));
rs.mock("@/lib/i18n/page-lang.server", () => ({ readPageLang: async () => fixture.lang }));

import HelpPage from "./page";
import { HELP_COPY } from "./help-copy";

beforeEach(() => { fixture.role = "OWNER"; fixture.lang = "es"; });
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/[\s ]+/g, " ").trim();
const spanishResponse = "Procuramos responder a las consultas de soporte y privacidad en un plazo de dos días laborables.";

it("has a Spanish entry for every English one", () => {
  expect(Object.keys(HELP_COPY.es).sort()).toEqual(Object.keys(HELP_COPY.en).sort());
});

it("draws Help's frame in Puerto Rico Spanish", async () => {
  const html = renderToStaticMarkup(await HelpPage());
  const out = text(html);
  for (const words of ["Ayuda", "Contacto", "Escribir a soporte", "No envíes datos privados por correo electrónico", "Preguntas comunes", "No puedo iniciar sesión", "Cómo hacerlo", "Aprobar tarjetas de tiempo"])
    expect(out).toContain(words);
  // The support answers (src/lib/legal) stay as published, so only the frame is checked for English.
  for (const english of ["Keep private details", "Common questions", "I can’t sign in", "How to", "Approve timecards"]) expect(out).not.toContain(english);
  expect(html).toContain('lang="es"');
  expect(html).toContain(`<p class="c-note c-help__note"><span>${spanishResponse}</span></p>`);
});

it.each(["EMPLOYEE", "LEAD"])("keeps the support-hours link with the approved Spanish note for %s", async (role) => {
  fixture.role = role;
  const html = renderToStaticMarkup(await HelpPage());
  expect(html).toContain(`<p class="eb-help-note">${spanishResponse} <a`);
  expect(html).toMatch(/<a[^>]*href="\/app\/profile\/support"[^>]*>Horario de soporte<\/a>/);
  expect(html).toContain(`<p class="c-note c-help__note"><span>${spanishResponse}</span></p>`);
});

it("keeps the published English response and support-hours link", async () => {
  fixture.lang = "en";
  fixture.role = "EMPLOYEE";
  const html = renderToStaticMarkup(await HelpPage());
  expect(html).toContain(`<p class="c-note c-help__note"><span>${HELP_COPY.en.supportResponseTime}</span></p>`);
  expect(html).toContain('<p class="eb-help-note">We aim to respond to support and privacy inquiries within two business days. <a');
  expect(html).toMatch(/<a[^>]*href="\/app\/profile\/support"[^>]*>Support hours<\/a>/);
});
