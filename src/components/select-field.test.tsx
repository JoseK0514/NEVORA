import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

const componentPath = fileURLToPath(new URL("./select-field.tsx", import.meta.url));

it("keeps the native select authoritative and preserves a selected inactive historical option", async () => {
  expect(existsSync(componentPath)).toBe(true);
  const { SelectField } = await import("./select-field");
  const html = renderToStaticMarkup(
    createElement(SelectField, {
      name: "positionId",
      label: "Position",
      hint: "Existing inactive values may be retained.",
      defaultValue: "legacy",
      options: [
        { value: "", label: "Choose a position", disabled: true },
        { value: "active", label: "Active position" },
        { value: "legacy", label: "Legacy position (inactive)", disabled: true },
      ],
    }),
  );

  expect(html.match(/name="positionId"/g)).toHaveLength(1);
  expect(html).toContain('class="nevora-select"');
  expect(html).toMatch(/<option[^>]*value="legacy"[^>]*disabled=""[^>]*selected=""/);
  expect(html).toContain("Existing inactive values may be retained.");
  expect(html).toMatch(/aria-describedby="[^"]+"/);
});

it("renders an explicit visible label and a 44px shared field contract", async () => {
  expect(existsSync(componentPath)).toBe(true);
  const { SelectField } = await import("./select-field");
  const html = renderToStaticMarkup(
    createElement(SelectField, {
      name: "role",
      label: "Access role",
      required: true,
      options: [{ value: "EMPLOYEE", label: "Employee" }],
    }),
  );

  expect(html).toContain("Access role");
  expect(html).toContain('required=""');
  expect(html).toContain('class="nevora-select"');
});

it("names the select by its label alone and describes it with the hint (IS-WA-12)", async () => {
  const { SelectField } = await import("./select-field");
  const html = renderToStaticMarkup(
    createElement(SelectField, {
      id: "position",
      name: "positionId",
      label: "Position",
      hint: "Existing inactive values may be retained.",
      options: [{ value: "active", label: "Active position" }],
    }),
  );

  expect(html).toContain('<span id="position-label" class="nevora-field-label">Position</span>');
  expect(html).toMatch(/<select[^>]*aria-labelledby="position-label"[^>]*aria-describedby="position-hint"/);
  expect(html).toContain('<span id="position-hint" class="nevora-field-hint">');
});
