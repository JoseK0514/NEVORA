import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from '@rstest/core';
import { AppErrorScreen, errorReference, portalErrorAdvice } from "./app-error-screen";
import RootError from "../app/error";
import GlobalError from "../app/global-error";
const router=rs.hoisted(()=>({refresh:rs.fn(),path:'/app/schedule'}));
rs.mock('next/navigation',()=>({useRouter:()=>router,usePathname:()=>router.path}));

rs.mock("./app-error-screen.css", () => ({}));
rs.mock("@/components/kit/kit.css", () => ({}));
rs.mock("@/app/not-found.css", () => ({}));
rs.mock("./public-error-screen.css", () => ({}));

it("uses the portal's own error words, with a retry and a full-load link home", () => {
  const html = renderToStaticMarkup(createElement(AppErrorScreen, { reset: () => {} }));
  // B7 wording (NV-120): one failure message, "This page didn’t load". Inspection Nov 14, 2026 (RA-15): online (as the
  // server render assumes) the fault is ours; the connection is the next step only when the browser is offline.
  expect(html).toContain('<p class="nv-sr" role="alert">This page didn’t load. Nothing was changed. Something went wrong on our side. Try again.</p>');
  expect(html.match(/role="alert"/g)).toHaveLength(1);
  expect(html).toContain("This page didn’t load");
  expect(html).toContain('<p class="app-error-screen__text">Something went wrong on our side. Try again.</p>');
  expect(portalErrorAdvice(false)).toBe("Check your connection, then try again.");
  expect(html).toMatch(/<button type="button" class="nv-btn" data-kind="primary"><svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>Try again<\/button>/);
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
  // RA-15: the root boundary shows Next's short reference for support to quote, once visibly and once in the alert;
  // the global boundary passes none.
  expect(root).toContain('<p class="app-error-screen__ref">Reference: 4074344408</p>');
  expect(root).toContain("Something went wrong on our side. Try again. Reference: 4074344408</p>");
  expect(global).not.toContain("4074344408");
});

it("prints only a short plain reference, never an arbitrary digest", () => {
  expect(errorReference("4074344408")).toBe("4074344408");
  expect(errorReference(" abc_DEF-1 ")).toBe("abc_DEF-1");
  for (const digest of [undefined, "", "NEXT_REDIRECT;replace;/login;307;", "<b>x</b>", "a".repeat(65)]) expect(errorReference(digest)).toBeNull();
});

it("signed-out and public addresses get the public screen: same words, Try again and Go to sign in", () => {
  const error = new Error("fictional failure");
  try {
    for (const path of ['/login', '/privacy', '/activate']) {
      router.path = path;
      for (const html of [renderToStaticMarkup(createElement(RootError, { error, reset: () => {} })), renderToStaticMarkup(createElement(GlobalError, { error, reset: () => {} }))]) {
        expect(html).toContain('class="nf-page pe-page"');
        expect(html).toContain("This page didn’t load");
        expect(html).toContain("Something went wrong");
        expect(html).toContain('role="alert">This page didn’t load. Something went wrong on our side. Try again.</p>');
        expect(html).toContain('<p class="not-found-text">Something went wrong on our side. Try again.</p>');
        // PB-025: the language switch, as on the 404.
        expect(html).toMatch(/<button type="button" class="q-auth__lang" lang="es"[^>]*>Español<\/button>/);
        expect(html).toMatch(/<button type="button" class="nf-cta pe-retry"><svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>Try again<\/button>/);
        expect(html).toContain('href="/login">Go to sign in</a>');
        expect(html).not.toContain('href="/app"');
      }
    }
    router.path = '/app';
    expect(renderToStaticMarkup(createElement(RootError, { error, reset: () => {} }))).toContain('href="/app"');
  } finally { router.path = '/app/schedule'; }
});

it("UI Try again asks Next to refetch (retry), not just re-render the failed result (reset)", async () => {
  const error = new Error("fictional transient failure"), reset = rs.fn(), retry = rs.fn();
  for (const Boundary of [RootError, GlobalError]) {
    const tree = JSON.stringify(Boundary({ error, reset, retry }), (_key, value) => typeof value === "function" ? (value === retry ? "RETRY" : value === reset ? "RESET" : "fn") : value);
    expect(tree).toContain('"reset":"RETRY"');
  }
  rs.doMock("@/components/kit/focus-after-retry", () => ({ focusAfterRetry: () => {} }));
  const PortalError = (await import("../app/app/error")).default;
  const find = (node: unknown): (() => void) | null => {
    if (!node || typeof node !== "object") return null;
    const props = (node as { props?: { onClick?: () => void; children?: unknown } }).props;
    if (props?.onClick) return props.onClick;
    const kids = props?.children; for (const kid of Array.isArray(kids) ? kids : [kids]) { const hit = find(kid); if (hit) return hit; }
    const type = (node as { type?: unknown }).type;
    // A piece that reads a hook (the online-aware words) can't be called outside a render; it holds no button.
    try { return typeof type === "function" && type.name !== "Link" ? find((type as (p: unknown) => unknown)((node as { props: unknown }).props)) : null; } catch { return null; }
  };
  find(PortalError({ error, reset, retry }))?.();
  expect(retry).toHaveBeenCalledOnce(); expect(reset).not.toHaveBeenCalled();
  expect(router.refresh).not.toHaveBeenCalled();
  find(PortalError({error,reset}))?.();
  expect(router.refresh).toHaveBeenCalledOnce();
  expect(reset).toHaveBeenCalledOnce();
});
