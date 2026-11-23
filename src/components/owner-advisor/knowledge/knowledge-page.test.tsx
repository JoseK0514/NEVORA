import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from "@rstest/core";

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }), usePathname: () => "/app/ai-manager/knowledge", useSearchParams: () => new URLSearchParams() }));
rs.mock("./knowledge.css", () => ({}));

import type { KnowledgeClient, KnowledgeEntry, KnowledgeVersionMeta } from "@/lib/owner-advisor/knowledge-client";
import type { Lang } from "../format";
import { AdvisorLangProvider } from "../lang";
import { KNOWLEDGE_COPY } from "./knowledge-copy";
import { KNOWLEDGE_VIEWS, KnowledgePage } from "./knowledge-page";

const DOC = "44444444-4444-4444-8444-444444444444", PROFILE = "33333333-3333-4333-8333-333333333333";
const V1 = "55555555-5555-4555-8555-555555555555", V2 = "66666666-6666-4666-8666-666666666666", P1 = "77777777-7777-4777-8777-777777777777";
const meta = (versionId: string, extra: Partial<KnowledgeVersionMeta> = {}): KnowledgeVersionMeta => ({ versionId, title: "Fictional opening procedure", locale: "en", category: "operations",
  sourceName: "opening.md", textDigest: "a".repeat(64), createdAt: "2026-11-15T12:00:00.000+00:00", publishedAt: null, effectiveFrom: null, effectiveUntil: null, reviewDue: null, ...extra });
const doc: KnowledgeEntry = { documentId: DOC, kind: "document", archived: false, publishedVersionId: V1,
  versions: [meta(V1, { publishedAt: "2026-11-15T12:05:00+00:00", reviewDue: "2026-11-18T12:00:00+00:00" }), meta(V2)] };
const profile: KnowledgeEntry = { documentId: PROFILE, kind: "profile", archived: false, publishedVersionId: P1, versions: [meta(P1, { title: "Business profile", locale: "es", category: "profile", sourceName: null, publishedAt: "2026-11-15T12:05:00+00:00" })] };
const client = { list: () => new Promise(() => {}), version: () => new Promise(() => {}), write: () => new Promise(() => {}) } as unknown as KnowledgeClient;
const ctx = (lang: Lang) => ({ client, timeZone: "America/Puerto_Rico", snapshot: { revision: 3, entries: [profile, doc] }, now: Date.parse("2026-11-23T12:00:00Z"), busy: false,
  t: KNOWLEDGE_COPY[lang], lang, send: async () => false, go: () => {} });
const { Library, EntryDetail, ProfileForm, DocumentForm, IssueCard } = KNOWLEDGE_VIEWS;

describe("company knowledge in Spanish", () => {
  it("says the page head and its loading state in Spanish", () => {
    const html = renderToStaticMarkup(<AdvisorLangProvider lang="es"><KnowledgePage timeZone="America/Puerto_Rico" view={{ name: "library" }} client={client} /></AdvisorLangProvider>);
    expect(html).toContain("Conocimiento de la empresa");
    expect(html).toContain("Solo los dueños pueden ver esto");
    expect(html).toContain("Cargando el conocimiento de la empresa");
    expect(html).not.toContain("Company knowledge");
    expect(html).not.toContain("Only Owners can see this");
  });
  it("lists the profile and documents in Spanish, with Spanish dates and statuses", () => {
    const html = renderToStaticMarkup(<Library ctx={ctx("es")} problem={null} />);
    for (const text of ["Perfil del negocio", "Español · actualizado 15 nov", "Operaciones · Inglés", "Revisión vencida", "Documentos", "1 de 20", "Añadir documento"]) expect(html).toContain(text);
    for (const text of ["Business profile", "updated", "Review due", "Add document", "Operations"]) expect(html).not.toContain(text);
    expect(html).toContain("Fictional opening procedure");
  });
  it("shows one document's status, versions and removal in Spanish", () => {
    const html = renderToStaticMarkup(<EntryDetail ctx={ctx("es")} entry={doc} problem={null} />);
    for (const text of ["Estado", "En uso por Rondo", "Versión 1 · publicada 15 nov", "Borrador por revisar", "Revisar antes del 18 nov", "Vencida", "Versiones", "Archivar o eliminar", "Borra todas las versiones"]) expect(html).toContain(text);
    for (const text of ["In use by Rondo", "Draft waiting for review", "Past due", "Archive or delete"]) expect(html).not.toContain(text);
  });
  it("labels the profile and document forms in Spanish", () => {
    const profileHtml = renderToStaticMarkup(<ProfileForm ctx={ctx("es")} cancel="/back" version={null} problem={null} />);
    for (const text of ["Qué hace el negocio", "Productos y servicios (opcional)", "Escrito en", "Fechas (opcional)", "Empieza al publicarse", "Guardar borrador", "Cancelar"]) expect(profileHtml).toContain(text);
    expect(profileHtml).not.toContain("Save draft");
    const docHtml = renderToStaticMarkup(<DocumentForm ctx={ctx("es")} entry={null} cancel="/back" version={null} problem={null} />);
    for (const text of ["Título", "Tema", "Texto simple", "Cargar archivo .txt o .md", ".txt o .md en UTF-8", "Servicio al cliente"]) expect(docHtml).toContain(text);
    expect(docHtml).not.toContain("Load a .txt or .md file");
  });
  it("says a write problem in Spanish", () => {
    const html = renderToStaticMarkup(<IssueCard t={KNOWLEDGE_COPY.es} kind="uncertain" op="publish" onRetry={() => {}} onAbandon={() => {}} />);
    expect(html).toContain("No pudimos confirmar si se publicó");
    expect(html).toContain("Verificar de nuevo");
    expect(html).not.toContain("Check again");
  });
  it("keeps English as it was", () => {
    const html = renderToStaticMarkup(<Library ctx={ctx("en")} problem={null} />);
    for (const text of ["Business profile", "Spanish · updated Nov 15", "Operations · English", "Review due", "1 of 20", "Add document"]) expect(html).toContain(text);
    const head = renderToStaticMarkup(<KnowledgePage timeZone="America/Puerto_Rico" view={{ name: "library" }} client={client} />);
    expect(head).toContain("Only Owners can see this");
    expect(head).toContain("Loading company knowledge");
  });
});
