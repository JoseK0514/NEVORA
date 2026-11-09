import { describe, expect, it } from "vitest";
import { passkeyConfig } from "./config";

describe("passkey environment selection", () => {
  it("is disabled by default", () => {
    expect(passkeyConfig("http://localhost:3000", {})).toBeNull();
  });
  it("uses localhost and the local port in development", () => {
    expect(passkeyConfig("http://localhost:4321", { NODE_ENV: "development", NEXT_PUBLIC_NEVORA_PASSKEYS: "on" }))
      .toEqual({ rpID: "localhost", origin: "http://localhost:4321" });
  });
  it("does not derive a production RP from request headers or URL", () => {
    expect(passkeyConfig("https://attacker.invalid", { NODE_ENV: "production", NEXT_PUBLIC_NEVORA_PASSKEYS: "on" })).toBeNull();
  });
  it("requires an explicit matching production origin and domain", () => {
    expect(passkeyConfig("https://proxy.internal", { NODE_ENV: "production", NEXT_PUBLIC_NEVORA_PASSKEYS: "on",
      NEVORA_PASSKEY_RP_ID: "nevora.example", NEVORA_PASSKEY_ORIGIN: "https://nevora.example" }))
      .toEqual({ rpID: "nevora.example", origin: "https://nevora.example" });
  });
  it.each([
    ["http://nevora.example", "nevora.example"],
    ["https://attacker.invalid", "nevora.example"],
    ["https://nevora.example/path", "nevora.example"],
    ["https://user:password@nevora.example", "nevora.example"],
    ["https://localhost", "localhost"],
  ])("refuses unsafe production origin %s / RP %s", (origin, rpID) => {
    expect(passkeyConfig("https://proxy.invalid", { NODE_ENV: "production", NEXT_PUBLIC_NEVORA_PASSKEYS: "on",
      NEVORA_PASSKEY_ORIGIN: origin, NEVORA_PASSKEY_RP_ID: rpID })).toBeNull();
  });
});
