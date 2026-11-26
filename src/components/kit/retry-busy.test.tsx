import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "@rstest/core";
import { BButton } from "@/components/owner-b/b-kit";
import { RetryLabel } from "./retry-label";
import { RETRY_MIN_MS } from "./use-retry";
import { ERROR_SCREENS_COPY } from "@/components/error-screens-copy";
import { AUTH_COPY } from "@/lib/auth-copy";

// Jose, Nov 26, 2026: Try again had no real loading state. While a retry runs, the button says it is working, keeps its
// width (both labels share one cell), stays focusable and takes no second press.
describe("Try again while busy", () => {
  it("the kit button keeps focus while busy: aria-disabled, never disabled", () => {
    const html = renderToStaticMarkup(<BButton kind="teal" onClick={() => {}} busy busyLabel="Trying again…" keepFocus>Try again</BButton>);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
    // The busy words show and the resting words hold the width, hidden.
    expect(html).toContain('<span class="b-busy__idle" data-b-off="">Try again</span>');
    expect(html).toMatch(/<span class="b-busy__on"><span class="b-spin[^"]*" aria-hidden="true"><\/span>Trying again…<\/span>/);
  });
  it("without keepFocus a busy kit button is still disabled, as before", () => {
    const html = renderToStaticMarkup(<BButton kind="teal" busy>Save</BButton>);
    expect(html).toMatch(/\sdisabled=""/);
    expect(html).not.toContain("aria-disabled");
  });
  it("the outer screens' label swaps faces in one cell and turns the arrow only while busy", () => {
    const busy = renderToStaticMarkup(<RetryLabel busy idle="Try again" working="Trying again…" />);
    expect(busy).toMatch(/<span class="nv-retry__face" data-off="">[\s\S]*?Try again<\/span>/);
    expect(busy).toMatch(/<span class="nv-retry__face"><svg[^>]*class="nv-retry__spin"[\s\S]*?Trying again…<\/span>/);
    const idle = renderToStaticMarkup(<RetryLabel busy={false} idle="Try again" working="Trying again…" />);
    expect(idle).toMatch(/<span class="nv-retry__face" data-off="" aria-hidden="true"><svg[^>]*class="nv-retry__spin"/);
  });
  it("says it in both languages, and shows long enough not to flash", () => {
    expect(ERROR_SCREENS_COPY.en.tryingAgain).toBe("Trying again…");
    expect(ERROR_SCREENS_COPY.es.tryingAgain).toBe("Intentando de nuevo…");
    expect(AUTH_COPY.en.errorScreen.retrying).toBe("Trying again…");
    expect(AUTH_COPY.es.errorScreen.retrying).toBe("Intentando de nuevo…");
    expect(RETRY_MIN_MS).toBeGreaterThanOrEqual(400);
  });
});

// QA, Nov 26, 2026: the portal's top-level error screen was English-only. It now reads the person's language.
import { portalErrorAdvice } from "@/components/app-error-screen";
describe("the portal's top-level error screen in Spanish", () => {
  it("gives the next step in the person's language", () => {
    expect(portalErrorAdvice(true)).toBe("Something went wrong on our side. Try again.");
    expect(portalErrorAdvice(true, "es")).toBe("Algo falló de nuestro lado. Inténtalo de nuevo.");
    expect(portalErrorAdvice(false, "es")).toBe("Revisa tu conexión y vuelve a intentarlo.");
  });
});
