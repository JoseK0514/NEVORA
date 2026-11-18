import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { POLICY_COPY } from "./policy-copy";
import { PolicySections } from "./policy-sections";
import { allOpen, foldingIds, openedIds, toggled, toggledAll } from "./policy-sections-state";

const ids = ["a", "b", "c"];
const sections = ids.map(id => ({ id, heading: `Heading ${id}`, body: <p>Text {id}</p> }));
const labels = { openAll: "Open all", closeAll: "Close all" };

describe("which policy sections are open (PB-034)", () => {
  it("opens the first section by default, and the one the address points at", () => {
    expect([...openedIds({ ids, pinFirst: false, choice: null, hash: "" })]).toEqual(["a"]);
    expect([...openedIds({ ids, pinFirst: false, choice: null, hash: "c" })]).toEqual(["a", "c"]);
    expect([...openedIds({ ids, pinFirst: false, choice: null, hash: "b-text" })]).toEqual(["a", "b"]);
    expect([...openedIds({ ids, pinFirst: false, choice: null, hash: "elsewhere" })]).toEqual(["a"]);
  });
  it("a pinned first section never folds, so nothing else starts open", () => {
    expect(foldingIds({ ids, pinFirst: true })).toEqual(["b", "c"]);
    expect([...openedIds({ ids, pinFirst: true, choice: null, hash: "" })]).toEqual([]);
  });
  it("a section's button opens or closes that section only", () => {
    const start = { ids, pinFirst: false, choice: null, hash: "" };
    const opened = toggled(start, "b");
    expect([...opened]).toEqual(["a", "b"]);
    expect([...toggled({ ...start, choice: opened }, "a")]).toEqual(["b"]);
  });
  it("Open all opens every section; pressed again it closes them", () => {
    const start = { ids, pinFirst: false, choice: null, hash: "" };
    expect(allOpen(start)).toBe(false);
    const everything = toggledAll(start);
    expect([...everything]).toEqual(ids);
    expect(allOpen({ ...start, choice: everything })).toBe(true);
    expect([...toggledAll({ ...start, choice: everything })]).toEqual([]);
    // What the person chose wins over the address from then on.
    expect([...openedIds({ ...start, choice: new Set(), hash: "c" })]).toEqual([]);
  });
});

describe("the sections before the page's script runs", () => {
  const html = renderToStaticMarkup(<PolicySections sections={sections} labels={labels} />);
  it("every section is a real heading with its text open, so the document reads in full", () => {
    expect(html.match(/<h2 class="pl-sec__h"/g)).toHaveLength(3);
    expect(html).not.toMatch(/ hidden=""/);
    for (const id of ids) {
      expect(html).toContain(`<section class="pl-sec" id="${id}" data-open="" aria-labelledby="${id}-title">`);
      expect(html).toMatch(new RegExp(`<h2 class="pl-sec__h" id="${id}-title"><button type="button" class="pl-sec__btn" disabled="" aria-expanded="true" aria-controls="${id}-text"><span>Heading ${id}</span>`));
      expect(html).toContain(`<div class="pl-sec__body" id="${id}-text"><p>Text ${id}</p></div>`);
    }
    // The caret is decoration.
    expect(html.match(/class="pl-sec__caret"/g)).toHaveLength(3);
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*class="pl-sec__caret"|<svg[^>]*class="pl-sec__caret"[^>]*aria-hidden="true"/);
  });
  it("offers Open all in the page's language", () => {
    expect(html).toContain('<button type="button" class="pl-all__btn" disabled="" aria-pressed="false">Open all</button>');
    const es = renderToStaticMarkup(<PolicySections sections={sections} labels={{ openAll: POLICY_COPY.es.openAll, closeAll: POLICY_COPY.es.closeAll }} />);
    expect(es).toContain(">Abrir todo</button>");
  });
  it("a pinned first section has a plain heading and carries what follows it", () => {
    const pinned = renderToStaticMarkup(<PolicySections sections={sections} labels={labels} pinFirst afterFirst={<p className="after">After</p>} />);
    expect(pinned).toContain('<h2 class="pl-sec__h" id="a-title">Heading a</h2>');
    expect(pinned).toContain('<div class="pl-sec__body" id="a-text"><p>Text a</p><p class="after">After</p></div>');
    expect(pinned.match(/class="pl-sec__btn"/g)).toHaveLength(2);
  });
  it("one folding section needs no Open all", () => {
    expect(renderToStaticMarkup(<PolicySections sections={sections.slice(0, 2)} labels={labels} pinFirst />)).not.toContain("pl-all");
  });
});

describe("the policy pages' words", () => {
  it("has every key in both languages, and Spanish leaks no English", () => {
    const flat = (value: unknown, path = ""): [string, string][] => typeof value === "string" ? [[path, value]]
      : value && typeof value === "object" ? Object.entries(value).flatMap(([key, inner]) => flat(inner, `${path}.${key}`)) : [];
    const en = new Map(flat({ ...POLICY_COPY.en, englishOnly: null })), es = new Map(flat({ ...POLICY_COPY.es, englishOnly: null }));
    expect([...es.keys()].sort()).toEqual([...en.keys()].sort());
    for (const [key, value] of es) { expect(value.trim(), key).not.toBe(""); expect(value, key).not.toBe(en.get(key)); }
    expect(POLICY_COPY.en.englishOnly).toBeNull();
    expect(POLICY_COPY.es.englishOnly?.before).toContain("solo en inglés");
    for (const value of [...en.values(), ...es.values()]) expect(value).not.toMatch(/[!—]|\(en inglés\)/);
  });
});
