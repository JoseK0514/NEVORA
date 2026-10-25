import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AppErrorScreen } from "./app-error-screen";
import RootError from "../app/error";
import GlobalError from "../app/global-error";
const router=vi.hoisted(()=>({refresh:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>router}));

vi.mock("@/components/quiet/quiet.css", () => ({}));
vi.mock("@/components/quiet/u1.css", () => ({}));

it("uses the portal's own Quiet error words, with a retry and a full-load link home (T-21)", () => {
  const html = renderToStaticMarkup(createElement(AppErrorScreen, { reset: () => {} }));
  expect(html).toContain('<div role="alert"><p class="q-body">Check your connection and try again.</p></div>');
  expect(html.match(/role="alert"/g)).toHaveLength(1);
  expect(html).toContain("This page didn’t load");
  expect(html).toMatch(/<button type="button" class="q-btn q-btn--sec">Try again<\/button>/);
  expect(html).toContain('aria-label="NEVORA"');
  expect(html).toContain('href="/app"');
  expect(html).not.toMatch(/ERROR \d|digest/i);
});

it("the root boundary and the global boundary render the same screen", () => {
  const error = Object.assign(new Error("statement timeout"), { digest: "4074344408" });
  const root = renderToStaticMarkup(createElement(RootError, { error, reset: () => {} }));
  const global = renderToStaticMarkup(createElement(GlobalError, { error, reset: () => {} }));
  expect(root).toContain("This page didn’t load");
  expect(global).toMatch(/^<html lang="en">(<head><\/head>)?<body/);
  expect(global).toContain("This page didn’t load");
  for (const html of [root, global]) expect(html).not.toContain("4074344408");
});

it("UI Try again asks Next to refetch (retry), not just re-render the failed result (reset)", async () => {
  const error = new Error("fictional transient failure"), reset = vi.fn(), retry = vi.fn();
  for (const Boundary of [RootError, GlobalError]) {
    const tree = JSON.stringify(Boundary({ error, reset, retry }), (_key, value) => typeof value === "function" ? (value === retry ? "RETRY" : value === reset ? "RESET" : "fn") : value);
    expect(tree).toContain('"reset":"RETRY"');
  }
  vi.doMock("@/components/kit/focus-after-retry", () => ({ focusAfterRetry: () => {} }));
  const PortalError = (await import("../app/app/error")).default;
  const find = (node: unknown): (() => void) | null => {
    if (!node || typeof node !== "object") return null;
    const props = (node as { props?: { onClick?: () => void; children?: unknown } }).props;
    if (props?.onClick) return props.onClick;
    const kids = props?.children; for (const kid of Array.isArray(kids) ? kids : [kids]) { const hit = find(kid); if (hit) return hit; }
    const type = (node as { type?: unknown }).type;
    return typeof type === "function" && type.name !== "Link" ? find((type as (p: unknown) => unknown)((node as { props: unknown }).props)) : null;
  };
  find(PortalError({ error, reset, retry }))?.();
  expect(retry).toHaveBeenCalledOnce(); expect(reset).not.toHaveBeenCalled();
  expect(router.refresh).not.toHaveBeenCalled();
  find(PortalError({error,reset}))?.();
  expect(router.refresh).toHaveBeenCalledOnce();
  expect(reset).toHaveBeenCalledOnce();
});
