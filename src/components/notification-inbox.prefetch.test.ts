import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// Inspection Oct 24: each notification row links to /app/notifications/open, a route handler that marks the item
// opened and redirects. Next prefetched those links and the handler correctly refused (three 404s per visit).
// Opening stays a real navigation; it is never prefetched, in either inbox.
// Team W (Oct 25): the open route now answers an unavailable item with a redirect (F18), so a client-side Link
// navigation (an RSC fetch with an extra _rsc query) was refused and landed on "unavailable". The rows are plain
// anchors: a full document load, never prefetched.
it.each(["./notification-inbox.tsx", "./notification-inbox-signature.tsx"])("%s never prefetches a notification's open link", file => {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  expect(source.match(/<Link\b[^>]*href=\{item\.href\}[^>]*>/g) ?? []).toEqual([]);
  expect((source.match(/<a\b[^>]*href=\{item\.href\}[^>]*>/g) ?? []).length).toBeGreaterThanOrEqual(1);
});
