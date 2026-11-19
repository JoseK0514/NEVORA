// Owner roster import: English and Spanish say the same things in the same shape.
import { describe, expect, it } from '@rstest/core';
import { parseRosterTable } from "@/lib/onboarding/roster";
import { rosterImportCopy } from "./copy";
import { headerField, REQUIRED_FIELDS } from "./table";

type Tree = { [key: string]: unknown };
/** Every leaf as "path: text"; a function leaf is called with small and plural arguments. */
function leaves(value: unknown, path = ""): string[] {
  if (typeof value === "string") return [`${path}: ${value}`];
  if (typeof value === "function") {
    const call = value as (...args: unknown[]) => unknown;
    return [[1, 1, "Ana"], [2, 3, "Ana"], [["Notes"]], [["Notes", "Extra"]], ["file.csv"], ["Edit", 4, "Ana Pérez"]].flatMap(args => { try { const out = call(...args); return typeof out === "string" ? [`${path}(): ${out}`] : []; } catch { return []; } });
  }
  if (Array.isArray(value)) return value.flatMap((item, index) => leaves(item, `${path}[${index}]`));
  return Object.entries(value as Tree).flatMap(([key, item]) => leaves(item, path ? `${path}.${key}` : key));
}
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Tree).map(([key, item]) => [key, shape(item)]));
  return typeof value;
}

describe("roster import copy", () => {
  const { en, es } = rosterImportCopy;
  it("has the same entries in English and Spanish", () => {
    expect(shape(es)).toEqual(shape(en));
  });
  it("has no empty string, no em dash and no exclamation mark in either language", () => {
    for (const text of [...leaves(en), ...leaves(es)]) {
      // The example's second person has no email on purpose: that cell is empty.
      if (!text.startsWith("add.example.rows[1][4]")) expect(text.split(": ").slice(1).join(": ").trim(), text).not.toBe("");
      expect(text, text).not.toMatch(/—|!/);
    }
  });
  it("translates every sentence (only names of things stay the same)", () => {
    const same = leaves(en).filter(line => leaves(es).includes(line)).map(line => line.split(":")[0]);
    expect(same.filter(path => !/^add\.example\.rows|^table\.[A-Z_]+$/.test(path))).toEqual([]);
  });
  it("says the two sentences the contract's handoff asks for", () => {
    expect(en.off.title).toBe("Staff list import isn’t available for this workplace yet.");
    expect(en.add.noEmail).toBe("Without an email, a person can clock in on the tablet but can’t sign in to NEVORA.");
    expect(en.review.summary(12, 2)).toBe("12 ready · 2 need a fix");
    expect(en.review.summary(1, 1)).toBe("1 ready · 1 needs a fix");
    expect(en.review.summary(12, 0)).toBe("12 ready");
  });
  it("labels the three headcounts differently in both languages", () => {
    for (const copy of [en, es]) expect(new Set([copy.counts.active.label, copy.counts.eligible.label, copy.counts.plan.label]).size).toBe(3);
  });
  it.each([["en", en], ["es", es]] as const)("offers a %s template and example the import reads", (_lang, copy) => {
    const template = copy.add.templateText.trim().split(",").map(headerField);
    expect(template).toEqual(["id", "firstName", "lastName", "phone", "email", "role"]);
    expect(REQUIRED_FIELDS.every(field => copy.add.example.head.map(headerField).includes(field))).toBe(true);
    const text = [copy.add.example.head.join(","), ...copy.add.example.rows.map(row => row.join(","))].join("\n");
    const parsed = parseRosterTable({ format: "csv", text, defaults: { primaryLocationId: "cafe" } });
    expect(parsed.state === "ready" && parsed.valid).toBe(true);
  });
});
