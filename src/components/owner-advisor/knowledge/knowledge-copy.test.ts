import { describe, expect, it } from "@rstest/core";
import { KNOWLEDGE_COPY, type KnowledgeDateField, type KnowledgeVerb } from "./knowledge-copy";

const { en, es } = KNOWLEDGE_COPY;
const shape = (value: unknown): unknown => typeof value === "function" ? "fn"
  : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, shape((value as Record<string, unknown>)[key])])) : typeof value;
// Words that are the same in both languages: the product name.
const SAME = new Set(["Rondo AI"]);

describe("company knowledge copy", () => {
  it("has the same keys in English and Spanish, nested tables included", () => {
    expect(shape(es)).toEqual(shape(en));
  });
  it("gives every function a non-empty answer in both languages", () => {
    const verbs: KnowledgeVerb[] = ["save", "publish", "archive", "delete"];
    const fields: KnowledgeDateField[] = ["effectiveFrom", "effectiveUntil", "reviewDue"];
    for (const t of [en, es]) {
      for (const verb of verbs) { expect(t.uncertainTitle(verb)).not.toBe(""); expect(t.invalidTitle(verb)).not.toBe(""); }
      for (const field of fields) { expect(t.dateSummary(field, "20")).not.toBe(""); expect(t.clearDate(field)).not.toBe(""); }
      const strings = [t.countOf(2, 20), t.profileUpdated("English", "Nov 20"), t.startsDay("x"), t.endedDay("x"), t.optional("x"), t.sizeOf("1 KB", "16 KB"),
        t.fromFile("a.md"), t.draftError("Enter a title"), t.startsAt("x"), t.publishedLine(1, "x", null), t.publishedLine(1, "x", "y"), t.savedLine(1, "x"), t.reviewBy("x"),
        t.version(2), t.savedDay("x"), t.archiveQ("x"), t.deleteQ("x"), t.erases(1), t.erases(3), t.plainTextMeta("x"), t.savedTextOf(1), t.replaces(1),
        t.startsSentence("x"), t.gapUntil("x"), t.stopsWhenPublish(1)];
      for (const text of strings) expect(text.length).toBeGreaterThan(0);
    }
  });
  it("says every Spanish string differently from the English, except the product name", () => {
    const pairs = (a: unknown, b: unknown, path: string): [string, unknown, unknown][] => typeof a === "string" ? [[path, a, b]]
      : a && typeof a === "object" ? Object.keys(a).flatMap(key => pairs((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`)) : [];
    for (const [path, english, spanish] of pairs(en, es, "")) if (!SAME.has(english as string)) expect({ path, spanish }).not.toEqual({ path, spanish: english });
    expect(es.erases(1)).not.toBe(en.erases(1));
    expect(es.uncertainTitle("publish")).not.toBe(en.uncertainTitle("publish"));
  });
  it("keeps English exactly as the page wrote it", () => {
    expect(en.uncertainTitle("publish")).toBe("We couldn’t confirm your publish");
    expect(en.invalidTitle("save")).toBe("That couldn’t be saved");
    expect(en.erases(3)).toBe("Erases all 3 versions for every Owner");
    expect(en.clearDate("reviewDue")).toBe("Clear review by");
    expect(en.categories.profile).toBe("Business profile");
    expect(en.locales.es).toBe("Spanish");
    expect(en.draftError("Line 2 has a hidden character. Remove it")).toBe("Line 2 has a hidden character. Remove it");
  });
  it("says the lib's and the file reader's error lines in Spanish", () => {
    expect(es.draftError("Enter a title")).toBe("Escribe un título");
    expect(es.draftError("Line 2 has a hidden character. Remove it")).toBe("La línea 2 tiene un carácter oculto. Quítalo");
    expect(es.draftError("Title too long (300 of 240 bytes)")).toBe("Título muy largo (300 de 240 bytes)");
    expect(es.draftError("Over the 256 KB limit. Split it up")).toBe("Supera el límite de 256 KB. Divídelo");
    expect(es.draftError("Over the 16 KB limit. Shorten it")).toBe("Supera el límite de 16 KB. Acórtalo");
    expect(es.draftError("Not UTF-8 text. Paste it instead")).toBe("No es texto UTF-8. Pégalo en su lugar");
  });
});
