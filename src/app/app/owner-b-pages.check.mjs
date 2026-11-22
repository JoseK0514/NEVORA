import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(new URL("../../../tools/ci-browser-runtime/package.json", import.meta.url));
const { chromium } = require("playwright");

test("phone page roots and their back-link bands fit a 390px viewport", async () => {
  const stylesheets = await Promise.all([
    "../../components/corp/corp.css",
    "corp-shell.css",
    "corp-quiet-bridge.css",
    "owner-b-pages.css",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    for (const [layout, band, back, title] of [
      ["c-page", "c-nav c-nav--phone", "c-nav__back", "c-nav__title"],
      ["q-page", "q-nav", "q-nav__l", "q-nav__t"],
    ]) {
      await page.setContent(`
        <style>body { margin: 0; --b-gutter: 14px; --b-space-20: 20px }</style>
        ${stylesheets.map((css) => `<style>${css}</style>`).join("")}
        <div class="app-shell" data-nv-corp data-nv-b>
          <main class="page-frame">
            <section class="${layout}">
              <nav class="${band}"><a class="${back}" href="/">Back</a><span class="${title}">Page title</span></nav>
              <p>Page content</p>
            </section>
          </main>
        </div>
      `);
      for (const selector of ["section", "nav"]) {
        const { x, width } = await page.locator(selector).boundingBox();
        assert.deepEqual({ x, width }, { x: 0, width: 390 }, `${layout} ${selector}`);
      }
      assert.equal(await page.evaluate(() => document.body.scrollWidth), 390, layout);
    }
  } finally {
    await browser.close();
  }
});
