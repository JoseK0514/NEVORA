// Phase 2 (package D): one Try again for one failure on Things to do.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }), usePathname: () => "/app/inbox", useSearchParams: () => new URLSearchParams() }));
rs.mock("./owner-b.css", () => ({}));

import { InboxB } from "./inbox-b";

// English flag A6: a retry button now draws its label in the busy-label cell.
const retries = (html: string) => html.split(/>Try again<\/(?:button|span)>/).length - 1;
const base = { families: [], total: null, statusLine: "", onRefresh: () => {}, back: false };

it("says both failures and offers one Try again when the list and the clock-ins both failed", () => {
  const html = renderToStaticMarkup(<InboxB {...base} ready={null} connection="unavailable" todayFailed />);
  expect(html).toContain("Clock-ins can’t be checked right now");
  expect(html).toContain("Things to do didn’t load");
  expect(retries(html)).toBe(1);
});
it("keeps the clock-ins retry while the list is only loading, and has none offline", () => {
  expect(retries(renderToStaticMarkup(<InboxB {...base} ready={null} connection="loading" todayFailed />))).toBe(1);
  expect(retries(renderToStaticMarkup(<InboxB {...base} ready={null} connection="unavailable" todayFailed={false} />))).toBe(1);
});
it("holds the More card while the list is loading, so arriving cards don't push it down; a failed read shows it", () => {
  expect(renderToStaticMarkup(<InboxB {...base} ready={null} connection="loading" todayFailed={false} />)).not.toContain('id="b-todo-more"');
  expect(renderToStaticMarkup(<InboxB {...base} ready={null} connection="reconnecting" todayFailed={false} />)).not.toContain('id="b-todo-more"');
  expect(renderToStaticMarkup(<InboxB {...base} ready={null} connection="unavailable" todayFailed={false} />)).toContain('id="b-todo-more"');
});
