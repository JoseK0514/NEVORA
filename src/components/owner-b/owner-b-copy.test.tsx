import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from "@rstest/core";
import { ATTENDANCE, OWNER_B_COPY } from "./owner-b-copy";

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }), usePathname: () => "/app", useSearchParams: () => new URLSearchParams() }));
rs.mock("./owner-b.css", () => ({}));

const { TeamB } = await import("./team-b");
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

it("matches the English keys and distinguishes the Spanish filter from the employee status", () => {
  expect(Object.keys(OWNER_B_COPY.es.team).sort()).toEqual(Object.keys(OWNER_B_COPY.en.team).sort());
  expect(OWNER_B_COPY.es.team.notClockedIn).toBe("Sin marcar");
  expect(ATTENDANCE.es.notClockedIn).toBe("Sin marcar entrada");
});

const team = (lang?: "en" | "es") => text(renderToStaticMarkup(<TeamB people={[{ id: "a", name: "Ana Rivera", detail: "Barista · Condado", href: "/app/employees/a", active: true }]}
  inactive={[{ id: "z", name: "Zoe Ortiz", detail: "", active: false }]} total={1} query="" filtered={false} people_word="People" person_word="person" status="active"
  tools={[]} lang={lang} />));

it("renders Team in Spanish", () => {
  const en = team();
  for (const words of ["Team", "Add", "Inactive", "Search people"]) expect(en).toContain(words);
  const es = team("es");
  for (const words of ["Equipo", "Añadir", "Inactivo", "Aplicar búsqueda"]) expect(es).toContain(words);
  for (const english of ["Team", "Inactive", "Apply search"]) expect(es).not.toContain(english);
  expect(renderToStaticMarkup(<TeamB people={[]} inactive={[]} total={0} query="" filtered={false} people_word="people" person_word="person" status="active" tools={[]} lang="es" />)).toContain('placeholder="Buscar personas"');
});

it("names every loading placeholder in Spanish, and the route error's Try again", async () => {
  const { B_LOADING_TABLE, loadingTitle } = await import("./b-loading");
  const titles = [...B_LOADING_TABLE.management, ...B_LOADING_TABLE.employee].map(([, shape]) => shape.title).filter((title): title is string => typeof title === "string");
  expect(titles.length).toBeGreaterThan(20);
  for (const title of titles) {
    expect(loadingTitle(title, "en")).toBe(title);
    // Only proper nouns may stay the same ("Clocker PINs" becomes "PIN del Clocker").
    if (!["Help"].includes(title)) expect(loadingTitle(title, "es"), title).not.toBe(title);
  }
  const { PortalLangProvider } = await import("@/lib/i18n/portal-lang");
  const { BRouteError } = await import("./b-route-error");
  const html = renderToStaticMarkup(<PortalLangProvider lang="es"><BRouteError title="Equipo" spoken="x" line="y" onRetry={() => {}} /></PortalLangProvider>);
  expect(html).toContain("Intentar de nuevo");
  expect(html).not.toContain("Try again");
});
