// Signed-in Spanish (es-rest): Help's frame follows the person's language; the support answers stay as published.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ usePathname: () => "/app/help", useRouter: () => ({ refresh: () => undefined }) }));
rs.mock("@/lib/auth/session", () => ({ requireSession: async () => ({ id: "fictional", role: "OWNER", firstName: "Ana", lastName: "Colón" }),
  requireSessionMutationProof: async () => ({ employee: { id: "fictional", role: "OWNER" }, sessionTokenHash: "a".repeat(64) }) }));
rs.mock("@/lib/payroll/service", () => ({ payrollFeatureEnabled: () => false, readPayrollCapabilities: async () => undefined }));
rs.mock("@/lib/workspace-presentation/current.server", () => ({ currentBrand: async () => ({ words: "standard", modules: undefined }) }));
rs.mock("@/lib/i18n/page-lang.server", () => ({ readPageLang: async () => "es" }));

import HelpPage from "./page";
import { HELP_COPY } from "./help-copy";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/[\s ]+/g, " ").trim();

it("has a Spanish entry for every English one", () => {
  expect(Object.keys(HELP_COPY.es).sort()).toEqual(Object.keys(HELP_COPY.en).sort());
});

it("draws Help's frame in Puerto Rico Spanish", async () => {
  const html = renderToStaticMarkup(await HelpPage());
  const out = text(html);
  for (const words of ["Ayuda", "Contacto", "Escribir a soporte", "No envíes datos privados por email", "Preguntas comunes", "No puedo iniciar sesión", "Cómo hacerlo", "Aprobar tarjetas de tiempo"])
    expect(out).toContain(words);
  // The support answers (src/lib/legal) stay as published, so only the frame is checked for English.
  for (const english of ["Keep private details", "Common questions", "I can’t sign in", "How to", "Approve timecards"]) expect(out).not.toContain(english);
  expect(html).toContain('lang="es"');
});
