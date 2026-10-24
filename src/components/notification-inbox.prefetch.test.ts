import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// Inspection Oct 24: each notification row links to /app/notifications/open, a route handler that marks the item
// opened and redirects. Next prefetched those links and the handler correctly refused (three 404s per visit).
// Opening stays a real navigation; it is never prefetched, in either inbox.
it.each(["./notification-inbox.tsx", "./notification-inbox-signature.tsx"])("%s never prefetches a notification's open link", file => {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const links = source.match(/<Link\b[^>]*href=\{item\.href\}[^>]*>/g) ?? [];
  expect(links.length).toBeGreaterThanOrEqual(1);
  for (const link of links) expect(link).toContain("prefetch={false}");
});
