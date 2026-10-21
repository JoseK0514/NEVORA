import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deviceName, fromBase64url, offerDismissedRecently, passkeysFlagOn, toBase64url } from "./client";
import { PasskeySlot } from "@/components/auth-premium/passkey-slot";
import { PasskeySection } from "@/components/passkeys/passkey-section";
import { AUTH_COPY } from "@/lib/auth-copy";
import { PASSKEY_COPY } from "./copy";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Face ID / passkeys client", () => {
  it("is off unless NEXT_PUBLIC_NEVORA_PASSKEYS=on, and renders nothing on the server either way", () => {
    expect(passkeysFlagOn()).toBe(false);
    expect(renderToStaticMarkup(createElement(PasskeySlot, { t: AUTH_COPY.en }))).toBe("");
    expect(renderToStaticMarkup(createElement(PasskeySection))).toBe("");
    vi.stubEnv("NEXT_PUBLIC_NEVORA_PASSKEYS", "on");
    expect(passkeysFlagOn()).toBe(true);
    // The sign-in button waits for the browser (WebAuthn support), so the server render stays empty.
    expect(renderToStaticMarkup(createElement(PasskeySlot, { t: AUTH_COPY.en }))).toBe("");
  });

  it("round-trips base64url without padding", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    const encoded = toBase64url(bytes);
    expect(encoded).toBe("AAEC-vv8_f7_");
    expect(new Uint8Array(fromBase64url(encoded!))).toEqual(bytes);
  });

  it("names the passkey after the device", () => {
    expect(deviceName("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("iPhone");
    expect(deviceName("Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile")).toBe("Android phone");
    expect(deviceName("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Windows computer");
    expect(deviceName("curl/8")).toBe("This device");
  });

  it("remembers Not now for 30 days", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    const now = Date.UTC(2026, 9, 20);
    expect(offerDismissedRecently(now)).toBe(false);
    store.set("nv-passkey-offer-dismissed", String(now));
    expect(offerDismissedRecently(now + 29 * 864e5)).toBe(true);
    expect(offerDismissedRecently(now + 31 * 864e5)).toBe(false);
  });

  it("has Spanish for every Profile and offer string", () => {
    expect(Object.keys(PASSKEY_COPY.es).sort()).toEqual(Object.keys(PASSKEY_COPY.en).sort());
    expect(PASSKEY_COPY.es.setUpPhone).toBe("Configurar Face ID");
    expect(AUTH_COPY.es.passkeyBusyPhone).toBe("Esperando Face ID…");
  });
});
