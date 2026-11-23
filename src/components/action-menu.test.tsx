import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import Link from "next/link";
import { expect, it } from '@rstest/core';

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

it('keeps the same native labelled popover when its trigger uses an icon',async()=>{
 const {ActionMenu}=await import('./action-menu');
 const html=renderToStaticMarkup(<ActionMenu id="icon-actions" label="Menu" ariaLabel="More navigation" triggerIcon={<svg aria-hidden="true"/>} iconOnly><Link href="/app/updates">Updates</Link></ActionMenu>);
 expect(html).toContain('popoverTarget="icon-actions"');
 expect(html).toContain('aria-label="More navigation"');
 expect(html).toContain('<span class="sr-only">Menu</span>');
 expect(html).toContain('popover="auto"');
 expect(html).toContain('href="/app/updates"');
 expect(html).not.toContain('nevora-action-menu-chevron');
});

// Phase 3 (TB-009): the account pill is marked while a page it opens is on screen; other menus never carry the mark.
it("marks the trigger as current only when asked", async () => {
  const { ActionMenu } = await import("./action-menu");
  const plain = renderToStaticMarkup(<ActionMenu id="plain-menu" label="More"><a href="/a" className="nevora-action-menu-item">A</a></ActionMenu>);
  const current = renderToStaticMarkup(<ActionMenu id="current-menu" label="Account" triggerCurrent><a href="/a" className="nevora-action-menu-item">A</a></ActionMenu>);
  expect(plain).not.toContain("aria-current");
  expect(current.split("</button>")[0]).toContain('aria-current="true"');
});

// G51 (Nov 23, 2026): every menu's trigger says whether it is open, its name starts with what it shows, and its items
// take the kit's teal ring (the menu is white wherever its trigger sits, the band included).
it("tells whether the menu is open and names a value trigger by what it shows first", async () => {
  const { ActionMenu, actionMenuTriggerName } = await import("./action-menu");
  expect(actionMenuTriggerName("Location", "Location: All your locations")).toBe("All your locations, Location");
  expect(actionMenuTriggerName("Bonus year", "Bonus year: Oct 2025 – Sep 2026")).toBe("Oct 2025 – Sep 2026, Bonus year");
  expect(actionMenuTriggerName("More", "More schedule actions")).toBe("More schedule actions");
  expect(actionMenuTriggerName("Sam Cruz", "Sam Cruz, account menu")).toBe("Sam Cruz, account menu");
  expect(actionMenuTriggerName("Menu")).toBe("Menu");
  const html = renderToStaticMarkup(<ActionMenu id="loc" label="Location" ariaLabel="Location: Condado"
    triggerContent={<>Condado</>}><a href="/a" className="nevora-action-menu-item">All your locations</a></ActionMenu>);
  const trigger = html.split("</button>")[0];
  expect(trigger).toContain('aria-label="Condado, Location"');
  expect(trigger).toContain('aria-expanded="false"');
  expect(trigger).toContain(">Condado");
});

it("rings a focused menu item in teal inside its box, over any band rule", () => {
  const foundation = readFileSync(fileURLToPath(new URL("../app/app/b-foundation.css", import.meta.url)), "utf8");
  const layer = foundation.slice(foundation.indexOf("@layer nv-b {"));
  expect(layer).toMatch(/:is\(#c-root, html\) :is\(#c-root, body\) :is\(#c-root, \.app-shell\)\[data-nv-b\] \.nevora-action-menu-popover :is\(a, button, \[tabindex\]\):focus-visible \{\s*outline: var\(--b-focus-width\) solid var\(--b-focus\) !important; outline-offset: calc\(-1 \* var\(--b-focus-width\)\) !important; \}/);
});
