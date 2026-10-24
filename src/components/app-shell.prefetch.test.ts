import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// Phase 1 (inspection Oct 24): each tab tap waited for a server round trip behind a placeholder React holds for
// 300 ms. The Owner and Manager tab bar now loads its destinations in full ahead of the tap, and the tapped tab
// lights up before its page arrives. The access frame still checks every page when it opens.
it("prefetches the Quiet tab bar's destinations and marks the tapped tab while it loads", () => {
  const source = readFileSync(new URL("./app-shell.tsx", import.meta.url), "utf8");
  const quietTabs = source.slice(source.indexOf("{mobileTabs.map((item) => {"), source.indexOf("</nav>", source.indexOf("{mobileTabs.map((item) => {")));
  expect(quietTabs).toMatch(/<Link\s+key=\{item\.href\}\s+href=\{item\.href\}[\s\S]*?\bprefetch\b/);
  expect(quietTabs).toMatch(/<Link href="\/app\/more" prefetch /);
  expect(quietTabs.match(/<TabPending \/>/g)).toHaveLength(2);
});
