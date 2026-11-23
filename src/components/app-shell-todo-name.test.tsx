import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from '@rstest/core';
import { AppShell } from "./app-shell";

// G6 (Nov 23, 2026): the Things to do entry and tab show their label and a count. Their accessible name starts with what
// they show ("Things to do, 7"; the phone tab's "To do, 7"), and the drawn text keeps the label and the count two words,
// so tools that compare the two (axe label-content-name-mismatch, voice control) find the label in the name.
const state = rs.hoisted(() => ({ count: 7 as number | null, pathname: "/app" }));
rs.mock("./use-inbox-count", () => ({ useInboxCount: () => state.count }));
rs.mock("next/navigation", () => ({ usePathname: () => state.pathname, useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams() }));
rs.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children),
  useLinkStatus: () => ({ pending: false }),
}));
rs.mock("@/app/login/actions", () => ({ logout: rs.fn() }));
rs.mock("next/image", () => ({ default: () => null }));

const company = { state: 'ready' as const, employeeId: 'actor', role: 'MANAGER' as const, source: 'LEGACY_ADOPTION' as const, scope: { mode: 'COMPANY' as const, locationIds: [] as [] }, scopeRevision: 1, authority: 'fictional', locations: [], observedAt: '2026-11-23T12:00:00.000Z' };

function entries(count: number | null) {
  state.count = count;
  const html = renderToStaticMarkup(<AppShell workspaceName="Northside Services" operationalAuthority={company as never} user={{ id: "actor", firstName: "Sam", lastName: "Cruz", role: "MANAGER" }}><h1>Home</h1></AppShell>);
  const link = (nav: string) => {
    const part = html.split(`aria-label="${nav}"`)[1].split("</nav>")[0];
    const anchor = /<a [^>]*href="\/app\/inbox"[^>]*>[\s\S]*?<\/a>/.exec(part)?.[0] ?? "";
    // What the entry draws: every text node, aria-hidden ones included (they are on screen), as axe reads it.
    const drawn = anchor.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return { name: /aria-label="([^"]*)"/.exec(anchor.split(">")[0])?.[1] ?? null, drawn };
  };
  return { sidebar: link("Primary navigation"), tab: link("Mobile navigation") };
}
const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const startsWith = (name: string, drawn: string) => words(name).slice(0, words(drawn).length).join(" ") === words(drawn).join(" ");

it("names the sidebar entry and the phone tab by what they draw, then the count", () => {
  const { sidebar, tab } = entries(7);
  expect(sidebar).toEqual({ name: "Things to do, 7", drawn: "Things to do 7" });
  expect(tab).toEqual({ name: "To do, 7", drawn: "To do 7" });
  for (const entry of [sidebar, tab]) expect(startsWith(entry.name ?? "", entry.drawn)).toBe(true);
});

it("reads a count past 99 as it is drawn", () => {
  const { sidebar, tab } = entries(120);
  expect(sidebar).toEqual({ name: "Things to do, 99+", drawn: "Things to do 99+" });
  expect(tab).toEqual({ name: "To do, 99+", drawn: "To do 99+" });
});

it("keeps the plain label and no count when nothing waits", () => {
  const { sidebar, tab } = entries(0);
  expect(sidebar).toEqual({ name: "Things to do", drawn: "Things to do" });
  expect(tab).toEqual({ name: null, drawn: "To do" });
});
