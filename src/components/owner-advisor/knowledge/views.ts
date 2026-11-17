/* The company-knowledge page's views and their addresses. Shared by the server page and the client screens. */

export type KnowledgeView =
  | { name: "library" }
  | { name: "profile" }
  | { name: "document"; documentId: string | null }
  | { name: "entry"; documentId: string }
  | { name: "version"; documentId: string; versionId: string };

const BASE = "/app/ai-manager/knowledge";
const UUID = /^[a-f0-9-]{36}$/;
export function viewFromParams(params: Record<string, string | string[] | undefined>): KnowledgeView {
  const one = (key: string) => { const value = params[key]; return typeof value === "string" && UUID.test(value) ? value : null; };
  const doc = one("doc"), version = one("version");
  switch (params.view) {
    case "profile": return { name: "profile" };
    case "new": return { name: "document", documentId: null };
    case "edit": return doc ? { name: "document", documentId: doc } : { name: "library" };
    case "entry": return doc ? { name: "entry", documentId: doc } : { name: "library" };
    case "version": return doc && version ? { name: "version", documentId: doc, versionId: version } : { name: "library" };
    default: return { name: "library" };
  }
}
export function viewHref(view: KnowledgeView) {
  switch (view.name) {
    case "library": return BASE;
    case "profile": return `${BASE}?view=profile`;
    case "document": return view.documentId ? `${BASE}?view=edit&doc=${view.documentId}` : `${BASE}?view=new`;
    case "entry": return `${BASE}?view=entry&doc=${view.documentId}`;
    case "version": return `${BASE}?view=version&doc=${view.documentId}&version=${view.versionId}`;
  }
}
