import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

const componentPath = fileURLToPath(new URL("./action-menu.tsx", import.meta.url));
const cssPath = fileURLToPath(new URL("../app/globals.css", import.meta.url));

it("renders one labelled popover trigger and bounded shared menu surface", async () => {
  expect(existsSync(componentPath)).toBe(true);
  const { ActionMenu } = await import("./action-menu");
  const html = renderToStaticMarkup(
    <ActionMenu
      id="test-actions"
      label="More"
      ariaLabel="More schedule actions"
    >
      <a href="/settings" className="nevora-action-menu-item">
        A deliberately long menu action label that must remain readable
      </a>
    </ActionMenu>,
  );

  expect(html).toContain('type="button"');
  expect(html).toContain('popoverTarget="test-actions"');
  expect(html).toContain('aria-label="More schedule actions"');
  expect(html).toContain('id="test-actions"');
  expect(html).toContain('popover="auto"');
  expect(html).toContain("nevora-action-menu-popover");
  expect(html).toContain("A deliberately long menu action label that must remain readable");
});

it("uses the canonical 44px action floor and fixed viewport-safe menu layer", () => {
  const css = readFileSync(cssPath, "utf8");
  expect(css).toMatch(/\.button\s*\{[\s\S]*?min-height:\s*44px/);
  expect(css).toMatch(/\.nevora-action-menu-popover\s*\{[\s\S]*?position:\s*fixed/);
  expect(css).toMatch(/\.nevora-action-menu-trigger\s*\{[\s\S]*?min-height:\s*44px/);
});
