import { describe, expect, it } from "@rstest/core";
import { SIGNUP_COPY, fill } from "./signup-copy";

function shape(value: unknown, path = ""): string[] {
  if (typeof value === "string") return [path];
  if (Array.isArray(value)) return value.flatMap((item, index) => shape(item, `${path}[${index}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => shape(item, path ? `${path}.${key}` : key));
}
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return Object.values(value as Record<string, unknown>).flatMap(strings);
}

describe("signup copy", () => {
  it("has the same keys and placeholders in English and Spanish, and no empty strings", () => {
    expect(shape(SIGNUP_COPY.es)).toEqual(shape(SIGNUP_COPY.en));
    const placeholders = (lang: "en" | "es") => shape(SIGNUP_COPY[lang]).map(path => {
      const value = path.split(/\.|\[|\]/).filter(Boolean).reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], SIGNUP_COPY[lang]);
      return `${path}:${(String(value).match(/\{[a-z]+\}/g) ?? []).sort().join(",")}`;
    });
    expect(placeholders("es")).toEqual(placeholders("en"));
    for (const lang of ["en", "es"] as const) for (const text of strings(SIGNUP_COPY[lang])) expect(text.trim().length).toBeGreaterThan(0);
  });
  it("never says a delivered email or a failed uncertain outcome", () => {
    const en = strings(SIGNUP_COPY.en).join("\n");
    expect(en).not.toMatch(/\bdelivered\b|\bfailed\b/i);
    const es = strings(SIGNUP_COPY.es).join("\n");
    expect(es).not.toMatch(/\bentregad[oa]s?\b|\bfall[óo]\b|\bfallid[oa]\b/i);
  });
  it("fills known placeholders and keeps unknown ones visible", () => {
    expect(fill("Go to {host} {nope}", { host: "a.example" })).toBe("Go to a.example {nope}");
  });
});
