/* The business records page's views and their addresses. Shared by the server page, the client screens and the evidence card. */
export type BusinessView =
  | { name: "library" }
  | { name: "new"; sourceId: string | null }
  | { name: "record"; sourceId: string }
  | { name: "version"; sourceId: string; versionId: string }
  | { name: "map" }
  | { name: "mapreview"; mapVersionId: string }
  | { name: "figures" };

const BASE = "/app/ai-manager/business";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function viewFromParams(params: Record<string, string | string[] | undefined>): BusinessView {
  const one = (key: string) => { const value = params[key]; return typeof value === "string" && UUID.test(value) ? value : null; };
  const record = one("record"), version = one("version");
  switch (params.view) {
    case "new": return { name: "new", sourceId: record };
    case "record": return record ? { name: "record", sourceId: record } : { name: "library" };
    case "version": return record && version ? { name: "version", sourceId: record, versionId: version } : { name: "library" };
    case "map": { const map = one("map"); return map ? { name: "mapreview", mapVersionId: map } : { name: "map" }; }
    case "figures": return { name: "figures" };
    default: return { name: "library" };
  }
}
export function viewHref(view: BusinessView) {
  switch (view.name) {
    case "library": return BASE;
    case "new": return view.sourceId ? `${BASE}?view=new&record=${view.sourceId}` : `${BASE}?view=new`;
    case "record": return `${BASE}?view=record&record=${view.sourceId}`;
    case "version": return `${BASE}?view=version&record=${view.sourceId}&version=${view.versionId}`;
    case "map": return `${BASE}?view=map`;
    case "mapreview": return `${BASE}?view=map&map=${view.mapVersionId}`;
    case "figures": return `${BASE}?view=figures`;
  }
}
