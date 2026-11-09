import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { TemplateSubmit, TemplateNameLink } from "./schedule-template-controls";
const status = vi.hoisted(() => ({ pending: false }));
vi.mock("react-dom", () => ({ useFormStatus: () => status }));

it("labels the specific template when idle and disables its submit while pending", () => {
  const props = { label: "Apply to this week", pendingLabel: "Applying…", ariaLabel: "Apply Regular week to Oct 12 – Oct 18", className: "button" };
  status.pending = false;
  const idle = renderToStaticMarkup(createElement(TemplateSubmit, props));
  expect(idle).toContain('aria-label="Apply Regular week to Oct 12 – Oct 18"');
  expect(idle).not.toContain('disabled=""');
  status.pending = true;
  const pending = renderToStaticMarkup(createElement(TemplateSubmit, props));
  expect(pending).toContain('disabled=""');
  expect(pending).toContain('aria-busy="true"');
  expect(pending).toContain('aria-live="polite">Applying…');
  status.pending = false;
});

it("moves empty-state guidance into the name field without hiding it under mobile navigation", () => {
  class NameInput {
    focus = vi.fn();
    scrollIntoView = vi.fn();
  }
  const input = new NameInput();
  const getElementById = vi.fn().mockReturnValue(input);
  vi.stubGlobal("HTMLInputElement", NameInput);
  vi.stubGlobal("document", { getElementById });
  try {
    const link = TemplateNameLink({ children: "Name your first template" });
    const preventDefault = vi.fn();
    link.props.onClick({ preventDefault });
    expect(getElementById).toHaveBeenCalledWith("st-template-name");
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(input.scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "auto" });
    expect(link.props.href).toBe("#st-template-name");
  } finally { vi.unstubAllGlobals(); }
});
