import { describe, expect, it } from "vitest";
import { defaultEntries } from "./wave-c-form";

// Review Nov 11 (OW-024): Save shows only after a change. The baseline is what the form was rendered with.
describe("the entries a settings form was rendered with", () => {
  it("reads each control's default, not what it holds now", () => {
    expect(defaultEntries([
      { name: "name", type: "text", value: "Typed since", defaultValue: "Northside" },
      { name: "timeZone", type: "text", value: "America/New_York", defaultValue: "America/Puerto_Rico" },
    ])).toBe(JSON.stringify([["name", "Northside"], ["timeZone", "America/Puerto_Rico"]]));
  });
  it("leaves out what a form post leaves out: the concurrency stamp, buttons, disabled and unchecked controls", () => {
    expect(defaultEntries([
      { name: "expectedUpdatedAt", type: "hidden", defaultValue: "2026-11-15T00:00:00Z" },
      { name: "id", type: "hidden", defaultValue: "p-1" },
      { name: "", type: "text", defaultValue: "no name" },
      { name: "save", type: "submit", defaultValue: "Save" },
      { name: "group", type: "fieldset" },
      { name: "locked", type: "text", defaultValue: "x", disabled: true },
      { name: "active", type: "checkbox", value: "true", defaultChecked: true },
      { name: "archived", type: "checkbox", defaultChecked: false },
      { name: "plain", type: "checkbox", defaultChecked: true },
    ])).toBe(JSON.stringify([["id", "p-1"], ["active", "true"], ["plain", "on"]]));
  });
  it("reads a select's default choice, or its first option when none is marked", () => {
    const options = [{ value: "a", defaultSelected: false }, { value: "b", defaultSelected: true }];
    expect(defaultEntries([{ name: "one", type: "select-one", options }])).toBe(JSON.stringify([["one", "b"]]));
    expect(defaultEntries([{ name: "one", type: "select-one", options: [{ value: "a", defaultSelected: false }] }])).toBe(JSON.stringify([["one", "a"]]));
    expect(defaultEntries([{ name: "many", type: "select-multiple", options: [{ value: "a", defaultSelected: true }, { value: "b", defaultSelected: true }] }])).toBe(JSON.stringify([["many", "a"], ["many", "b"]]));
    expect(defaultEntries([{ name: "none", type: "select-one", options: [] }])).toBe("[]");
  });
});
